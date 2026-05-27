import type {
    Connection,
    Finality,
    PublicKey,
    TransactionResponse,
    VersionedTransactionResponse,
} from "@solana/web3.js";
import * as anchor from "@anchor-lang/core";
import { Buffer } from "buffer";
import bs58 from "bs58";
import { sleep } from "../../utils/helpers";
import type { AnchorCpiDecodedEvent, AnchorCpiEventContext, AnchorCpiEventListenerParams, AnchorCpiEventSubscription } from "./types";

type InternalListener = {
    id: number;
    eventNames?: Set<string>;
    parse?: AnchorCpiEventListenerParams<any, any>["parse"];
    filter?: AnchorCpiEventListenerParams<any, any>["filter"];
    onEvent: AnchorCpiEventListenerParams<any, any>["onEvent"];
    onError?: (error: unknown) => void;
};

const normalizeEventNameSet = (eventName?: string | string[]): Set<string> | undefined => {
    if (!eventName) return undefined;
    return new Set(Array.isArray(eventName) ? eventName : [eventName]);
}

const getTxAccountKeys = (tx: TransactionResponse | VersionedTransactionResponse | any): PublicKey[] => {
    const message = tx?.transaction?.message;

    const staticKeys: PublicKey[] =
        message?.staticAccountKeys ??
        message?.accountKeys ??
        [];

    const loadedWritable: PublicKey[] =
        tx?.meta?.loadedAddresses?.writable ?? [];

    const loadedReadonly: PublicKey[] =
        tx?.meta?.loadedAddresses?.readonly ?? [];

    return [
        ...staticKeys,
        ...loadedWritable,
        ...loadedReadonly,
    ];
}

const getTransactionWithRetry = async (
    connection: Connection,
    signature: string,
    commitment: Finality,
    maxRetries: number,
): Promise<TransactionResponse | VersionedTransactionResponse | any | null> => {
    for (let i = 0; i < maxRetries; i += 1) {
        const tx = await connection.getTransaction(signature, {
            commitment,
            maxSupportedTransactionVersion: 0,
        });

        if (tx) return tx;

        // logsSubscribe can fire before getTransaction is available.
        await sleep(120 * (i + 1));
    }

    return null;
}

const decodeAnchorCpiEventsFromTransaction =(
    tx: TransactionResponse | VersionedTransactionResponse,
    programId: PublicKey,
    coder: anchor.BorshCoder,
    slot: number,
    signature: string,
): AnchorCpiDecodedEvent[] => {
    const innerInstructions = tx?.meta?.innerInstructions ?? [];
    if (!innerInstructions.length) return [];

    const accountKeys = getTxAccountKeys(tx);
    const events: AnchorCpiDecodedEvent[] = [];

    for (const group of innerInstructions) {
        for (const ix of group.instructions ?? []) {
            const ixProgramId = accountKeys[ix.programIdIndex];

            if (!ixProgramId || !ixProgramId.equals(programId)) {
                continue;
            }

            if (typeof ix.data !== "string") {
                continue;
            }

            let raw: Buffer;

            try {
                raw = Buffer.from(bs58.decode(ix.data));
            } catch {
                continue;
            }

            // coder.events.decode wants [event discriminator + payload],
            // so skip only the first 8 bytes.
            if (raw.length < 16) {
                continue;
            }

            try {
                const anchorEventBytes = raw.subarray(8);
                const anchorEventBase64 = anchorEventBytes.toString("base64");

                const decoded = coder.events.decode(anchorEventBase64);

                if (decoded) {
                    events.push({
                        name: decoded.name,
                        data: decoded.data,
                        slot,
                        signature,
                        tx,
                    });
                }
            } catch {
                // Not an Anchor CPI event. Ignore.
            }
        }
    }

    return events;
}

export class AnchorCpiEventClient {
    private listenerIdCounter = 1;
    private listeners = new Map<number, InternalListener>();

    private logsSubscriptionId?: number;
    private commitment: Finality;

    constructor(
        private readonly connection: Connection,
        private readonly programId: PublicKey,
        private readonly coder: anchor.BorshCoder,
        defaultCommitment: Finality = "confirmed",
    ) {
        this.commitment = defaultCommitment;
    }

    listen<TRaw = unknown, TParsed = TRaw>(
        params: AnchorCpiEventListenerParams<TRaw, TParsed>,
    ): AnchorCpiEventSubscription {
        const id = this.listenerIdCounter++;

        this.listeners.set(id, {
            id,
            eventNames: normalizeEventNameSet(params.eventName),
            parse: params.parse,
            filter: params.filter,
            onEvent: params.onEvent,
            onError: params.onError,
        });

        this.ensureStarted(
            params.commitment ?? this.commitment,
            params.maxRetries ?? 6,
        );

        return {
            id,
            stop: async () => {
                this.listeners.delete(id);
                await this.stopIfIdle();
            },
        };
    }

    private ensureStarted(commitment: Finality, maxRetries: number): void {
        if (this.logsSubscriptionId !== undefined) {
            return;
        }

        this.logsSubscriptionId = this.connection.onLogs(
            this.programId,
            async (logs, ctx) => {
                if (logs.err) return;

                let tx: TransactionResponse | VersionedTransactionResponse | any | null = null;

                try {
                    tx = await getTransactionWithRetry(
                        this.connection,
                        logs.signature,
                        commitment,
                        maxRetries,
                    );

                    if (!tx) {
                        this.dispatchError(
                            new Error(
                                `Could not fetch transaction for signature ${logs.signature}`,
                            ),
                        );
                        return;
                    }

                    const decodedEvents = decodeAnchorCpiEventsFromTransaction(
                        tx,
                        this.programId,
                        this.coder,
                        ctx.slot,
                        logs.signature,
                    );

                    for (const decoded of decodedEvents) {
                        await this.dispatch(decoded);
                    }
                } catch (err) {
                    this.dispatchError(err);
                }
            },
            commitment,
        );
    }

    private async dispatch(decoded: AnchorCpiDecodedEvent): Promise<void> {
        const ctx: AnchorCpiEventContext = {
            slot: decoded.slot,
            signature: decoded.signature,
            tx: decoded.tx,
        };

        for (const listener of this.listeners.values()) {
            try {
                if (
                    listener.eventNames &&
                    !listener.eventNames.has(decoded.name)
                ) {
                    continue;
                }

                const parsed = listener.parse
                    ? await listener.parse(decoded.data, ctx, decoded)
                    : decoded.data;

                if (parsed === null || parsed === undefined) {
                    continue;
                }

                if (
                    listener.filter &&
                    !(await listener.filter(parsed, ctx, decoded))
                ) {
                    continue;
                }

                await listener.onEvent(parsed, ctx, decoded);
            } catch (err) {
                listener.onError?.(err);
            }
        }
    }

    private dispatchError(error: unknown): void {
        for (const listener of this.listeners.values()) {
            listener.onError?.(error);
        }
    }

    private async stopIfIdle(): Promise<void> {
        if (this.listeners.size > 0) {
            return;
        }

        if (this.logsSubscriptionId === undefined) {
            return;
        }

        const id = this.logsSubscriptionId;
        this.logsSubscriptionId = undefined;

        await this.connection.removeOnLogsListener(id);
    }
}