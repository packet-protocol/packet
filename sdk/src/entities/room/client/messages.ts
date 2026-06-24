import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

import type { PacketClient } from "../../../client.js";
import type { Bytes } from "../../../types/common.js";
import { text, utf8 } from "../../../utils/encoding.js";
import { toBN } from "../../../utils/bytes.js";
import { ClientCache } from "../../../core/cache.js";
import { PacketTransactionClient } from "../../transaction/client.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { MessageType } from "../../message/types.js";
import type { RoomMessageData } from "../type/index.js";
import { roomMessageAddress } from "../utils/address.js";
import {
    GetRoomMessageAccount,
    GetRoomMessagesBucket,
    GetRoomMessagesByRoom,
    ROOM_MESSAGE_BUCKET_SIZE,
} from "../account/message.js";
import { RoomSendMessageTx } from "../transactions/send-message.js";
import {
    encryptRoomMessageContent,
    randomClientMsgId,
} from "../utils/crypto.js";
import { RoomMessageClient, type RoomMessageDecryptResult } from "./message.js";
import type { RoomClient } from "./room.js";
import type {
    PacketLoadedContent,
    ParsedPacketMessageContent,
} from "../../message/content.js";

export type RoomSendMessageParams =
    | { text: string; content?: never; messageType?: never }
    | { content: Bytes; messageType: MessageType; text?: never };

export type RoomSendMessageOptions = PacketIxOptions & PacketTxOptions & {
    /**
     * Set to `false` to bypass this instance's send queue (see `send()`):
     * the send executes immediately, concurrently with any queued sends.
     * Only do this if you serialize this member's sends yourself — two
     * in-flight sends from the SAME member conflict on-chain.
     */
    serialize?: boolean;
};

export type RoomSendMessageResult = {
    receipt: string[];
    /** Random 64-byte client message id used as the address seed. */
    clientMsgId: Uint8Array;
    /** Derived compressed message address. */
    address: PublicKey;
    /** Fetched message account (null if not yet visible to the indexer). */
    message: RoomMessageData | null;
};

export type RoomLoadedMessage = {
    message: RoomMessageData;
    /**
     * Per-message handle for lazily resolving content
     * (`handle.loadContent()` / `handle.loadParsedContent()`). The same cached
     * instance this client uses, so its decrypt/content caches survive refetches.
     */
    handle: RoomMessageClient;
    /**
     * decrypted — plaintext available;
     * locked — this wallet is not a recipient of the message's crypto epoch;
     * failed — epoch key recovered but decryption failed (tamper/corrupt).
     */
    status: "decrypted" | "locked" | "failed";
    /**
     * Decrypted plaintext bytes (status "decrypted"). For content-typed messages
     * (Url/Irys/Ipfs/Arweave) this is the decrypted pointer, not the resolved
     * content; the resolved content lives in `loaded`/`parsed`.
     */
    content?: Uint8Array;
    /**
     * UTF-8 decoded plaintext (status "decrypted"). For content-typed messages
     * this is the raw pointer string; use `parsed` for resolved content.
     */
    text?: string;
    /** Resolved external content, populated when `includeContent` is set. */
    loaded?: PacketLoadedContent;
    /** Envelope-parsed, render-ready content, populated when `parse` is set. */
    parsed?: ParsedPacketMessageContent;
    /** Failure detail (status "failed"). */
    error?: string;
};

export type RoomLoadBucketOptions = {
    /** Bypass the bucket cache and refetch from Photon. */
    force?: boolean;
    /**
     * The CURRENT bucket (room.currentBucket) is mutable — it is still
     * filling, so by default it is ALWAYS refetched. Set a TTL (ms) to allow
     * serving a recently fetched current bucket from cache. Completed buckets
     * (full, or below room.currentBucket) are immutable and cached forever
     * (until force).
     */
    currentBucketTtlMs?: number;
};

export type RoomLoadMessagesOptions = RoomLoadBucketOptions & {
    /** Max messages to return (default one bucket, 100). */
    limit?: number;
    /** Only messages with globalSeq < beforeSeq (exclusive upper bound). */
    beforeSeq?: BN | number;
    /** backward = newest-first walk (default); forward = from bucket 0 up. */
    direction?: "backward" | "forward";
    /** Max buckets to walk before giving up (default 5). */
    maxBuckets?: number;
    /** Decrypt the collected messages (default true; one epoch-key recovery per cryptoEpoch). */
    decrypt?: boolean;
    /** Also fetch external content (Url/Ipfs/Irys/Arweave) for decrypted messages (default false). */
    includeContent?: boolean;
    /**
     * Also envelope-parse (and packet-decrypt) the fetched content, priming
     * each handle's parsed content so consumers get render-ready messages
     * (mirrors the p2p `MessageClient.loadParsedContent`). Implies
     * `includeContent`. Default false.
     */
    parse?: boolean;
    /** Concurrency for per-message decrypt/content fetches (default 10). */
    concurrentFetchLimit?: number;
};

export type RoomLoadMessagesByScanParams = {
    /** Photon scan page size. */
    limit?: number;
    cursor?: string;
    /** Optional memcmp filter on the sender. */
    sender?: PublicKey;
};

export type RoomLoadMessagesByScanResult = {
    items: RoomLoadedMessage[];
    cursor: string | null;
};

type RoomBucketPage = {
    fetchedAt: number;
    /** Immutable: the bucket was full, or below room.currentBucket when fetched. */
    complete: boolean;
    items: RoomMessageClient[];
};

/**
 * Bounded epoch-race retries for a single `send()`. A retry happens only when
 * the program rejects with `SendEpochChanged` (a header published while the
 * send was in flight); each retry re-fetches the room, re-recovers the new
 * epoch key and re-encrypts the body under it.
 */
export const ROOM_SEND_MAX_EPOCH_RETRIES = 3;

/** Anchor error code of PacketError::SendEpochChanged (6000 + variant index 66). */
export const ROOM_SEND_EPOCH_CHANGED_CODE = 6066;

/**
 * Detect a `SendEpochChanged` program rejection across the shapes it can take:
 * - confirm path: status.err is `{"InstructionError":[i,{"Custom":6066}]}`
 *   (the tx client stringifies it into the Error message);
 * - preflight path: web3.js SendTransactionError carries logs and a message
 *   with `custom program error: 0x17b2` and/or `Error Code: SendEpochChanged`.
 */
export function isSendEpochChangedError(err: unknown): boolean {
    const hex = "0x" + ROOM_SEND_EPOCH_CHANGED_CODE.toString(16); // 0x17b2
    const haystacks: string[] = [];
    if (err instanceof Error) haystacks.push(err.message);
    const anyErr = err as any;
    if (anyErr?.logs) haystacks.push(Array.isArray(anyErr.logs) ? anyErr.logs.join("\n") : String(anyErr.logs));
    if (anyErr?.transactionLogs) {
        haystacks.push(Array.isArray(anyErr.transactionLogs) ? anyErr.transactionLogs.join("\n") : String(anyErr.transactionLogs));
    }
    const text = haystacks.join("\n");
    return (
        text.includes("SendEpochChanged")
        || text.includes(`"Custom":${ROOM_SEND_EPOCH_CHANGED_CODE}`)
        || text.includes(`Custom(${ROOM_SEND_EPOCH_CHANGED_CODE})`)
        || text.includes(`custom program error: ${hex}`)
        || text.includes(`Error Number: ${ROOM_SEND_EPOCH_CHANGED_CODE}`)
    );
}

/** bucket = floor((globalSeq - 1) / 100) — mirrors Room::acquire_message_slot. */
export function roomBucketForSeq(globalSeq: BN | number): number {
    const seq = toBN(globalSeq);
    if (seq.lten(0)) {
        throw new Error(`globalSeq must be >= 1, got ${seq.toString()}`);
    }
    return seq.subn(1).divn(ROOM_MESSAGE_BUCKET_SIZE).toNumber();
}

/**
 * Room messages sub-client (encrypt/send + bucket-based loading), treating the
 * room like one big thread: messages live in buckets of 100 (program-assigned
 * sequential counter), each bucket is fetched in ONE Photon query and cached.
 * Obtained via `roomClient.messages()`.
 */
export class RoomMessagesClient {

    /** One handle per message address so decrypt/content caches survive refetches. */
    private readonly handles = new ClientCache<PublicKey, RoomMessageClient>(
        (address) => address.toBase58(),
    );

    private readonly buckets = new ClientCache<number, RoomBucketPage>();

    constructor(
        private readonly client: PacketClient,
        private readonly roomClient: RoomClient,
    ) { }

    /**
     * Tail of the per-instance send queue. Every send nullifies and re-appends
     * the sender's RoomMember compressed account (the per-member send guard),
     * so two in-flight sends from one member conflict on-chain. Sends are
     * serialized by awaiting the previous send's settlement (not success), so a
     * failed send rejects only its own caller without poisoning the queue.
     */
    private sendQueue: Promise<unknown> = Promise.resolve();

    /**
     * Encrypt and send a message with the CURRENT epoch's message key.
     * Requires this wallet to be an active member covered by the latest header.
     *
     * Concurrent `send()` calls on this instance are serialized through an
     * internal queue (see `sendQueue` for why). Pass `serialize: false` in
     * the options to opt out.
     */
    async send(
        params: RoomSendMessageParams,
        options?: RoomSendMessageOptions,
    ): Promise<RoomSendMessageResult> {
        if (options?.serialize === false) {
            return this.sendNow(params, options);
        }

        const result = this.sendQueue.then(() => this.sendNow(params, options));
        // Queue link swallows the rejection; `result` still rejects for THIS caller.
        this.sendQueue = result.catch(() => undefined);
        return result;
    }

    private async sendNow(
        params: RoomSendMessageParams,
        options?: PacketIxOptions & PacketTxOptions,
    ): Promise<RoomSendMessageResult> {
        const { member } = await this.roomClient.myMember();
        if (member.status !== 0) {
            throw new Error("cannot send: this wallet's room membership is removed");
        }

        const plaintext = params.text !== undefined ? utf8(params.text) : params.content;
        const messageType = params.text !== undefined ? MessageType.Text : params.messageType;

        const roomId = this.roomClient.roomId;
        // The same clientMsgId is reused across epoch-race retries: the message
        // address is seed-derived from it, so every attempt targets the SAME
        // address (idempotent). A retry only happens after a tx that FAILED
        // (epoch guard rejected -> nothing was created), so the create never
        // conflicts with a previously-landed account.
        const clientMsgId = randomClientMsgId();

        const optionsOverride = options ?? this.client.defaultTxOptions ?? {};
        if (!optionsOverride.lookupTables) {
            optionsOverride.lookupTables = await this.client.loadLookupTables();
        }

        // Epoch-pin send: the body is encrypted under the epoch recovered here,
        // pinned into the instruction as expectedCryptoEpoch. The program
        // assigns crypto_epoch from room.current_epoch at landing; a header
        // published mid-flight rejects with SendEpochChanged, triggering a
        // re-fetch, re-recover, re-encrypt and bounded retry.
        let lastErr: unknown;
        for (let attempt = 0; attempt < ROOM_SEND_MAX_EPOCH_RETRIES; attempt++) {
            const epochKey = await this.roomClient.recoverEpochKey();
            if (epochKey.status !== "ok") {
                throw new Error(`cannot send: wallet is not a recipient of the current epoch ${epochKey.epoch.toString()}`);
            }

            const content = await encryptRoomMessageContent({
                messageEpochKey: epochKey.key,
                roomId,
                clientMsgId,
                plaintext,
            });

            const tx = await RoomSendMessageTx(
                this.client.connection,
                this.client.lightRpc,
                this.client.walletPublicKey,
                this.client.program,
                {
                    roomId,
                    era: this.roomClient.Room.era,
                    clientMsgId,
                    message: {
                        messageType,
                        content,
                    },
                    expectedCryptoEpoch: epochKey.epoch,
                },
                optionsOverride,
            );

            const transactionClient = new PacketTransactionClient(this.client.connection);
            transactionClient.addTransaction(...tx);

            let receipt: string[];
            try {
                receipt = await transactionClient.submitAndConfirm(this.client.wallet, optionsOverride?.options);
            } catch (err) {
                if (isSendEpochChangedError(err) && attempt < ROOM_SEND_MAX_EPOCH_RETRIES - 1) {
                    // Epoch moved: next attempt re-recovers and re-encrypts.
                    lastErr = err;
                    continue;
                }
                throw err;
            }

            const address = roomMessageAddress({
                room: this.roomClient.address,
                era: this.roomClient.Room.era,
                clientMsgId,
                programId: this.client.program.programId,
            });

            const message = await this.loadMessageRetrying(address);
            if (message) {
                this.handleFor(message).primeDecrypted({
                    status: "decrypted",
                    content: Uint8Array.from(plaintext),
                    text: params.text !== undefined ? params.text : tryText(plaintext),
                });
            }

            return { receipt, clientMsgId, address, message };
        }

        throw new Error(
            `cannot send: room epoch kept changing after ${ROOM_SEND_MAX_EPOCH_RETRIES} attempts`
            + (lastErr instanceof Error ? ` (last: ${lastErr.message.split("\n")[0]})` : ""),
        );
    }

    /**
     * Single message handle by compressed address or 64-byte clientMsgId
     * (address derived via roomMessageAddress). Handles are cached per address.
     */
    message(ref: PublicKey | Bytes): RoomMessageClient {
        const address = ref instanceof PublicKey
            ? ref
            : roomMessageAddress({
                room: this.roomClient.address,
                era: this.roomClient.Room.era,
                clientMsgId: ref,
                programId: this.client.program.programId,
            });

        return this.handles.getOrCreate(address, () =>
            RoomMessageClient.Handle({ roomClient: this.roomClient, address }),
        );
    }

    /** Fetch a single message by clientMsgId and decrypt it (cached). */
    async loadMessage(clientMsgId: Bytes): Promise<RoomLoadedMessage | null> {
        const handle = this.message(clientMsgId);

        if (!handle.Loaded) {
            const data = await GetRoomMessageAccount(this.client, handle.address);
            if (!data) return null;
            handle.loadFromData(data);
        }

        return toRoomLoadedMessage(handle, await handle.decrypt());
    }

    /**
     * Load one whole bucket (≤ 100 messages, one Photon query) and cache it.
     *
     * Caching semantics: completed buckets (full, or below room.currentBucket
     * at fetch time) are immutable and served from cache. The CURRENT bucket
     * is still filling, so it is refetched on every call unless a
     * `currentBucketTtlMs` allows a recent fetch to be reused, or `force`
     * busts everything.
     */
    async loadBucket(bucket: number, options: RoomLoadBucketOptions = {}): Promise<RoomMessageClient[]> {
        if (!Number.isInteger(bucket) || bucket < 0) {
            throw new Error(`bucket must be a non-negative integer, got ${String(bucket)}`);
        }

        const cached = this.buckets.get(bucket);
        if (cached && !options.force) {
            if (cached.complete) {
                return cached.items;
            }
            const ttl = options.currentBucketTtlMs ?? 0;
            if (ttl > 0 && Date.now() - cached.fetchedAt < ttl) {
                return cached.items;
            }
        }

        const data = await GetRoomMessagesBucket({
            client: this.client,
            room: this.roomClient.address,
            bucket,
        });

        const items = data.map((entry) => this.handleFor(entry));

        const complete =
            items.length >= ROOM_MESSAGE_BUCKET_SIZE
            || bucket < this.roomClient.Room.currentBucket;

        this.buckets.set(bucket, { fetchedAt: Date.now(), complete, items });

        return items;
    }

    /**
     * Thread-like message loading over buckets.
     *
     * Refreshes the room, computes the starting bucket from room.globalLen (or
     * from `beforeSeq`; bucket = floor((seq - 1) / 100), the program's
     * acquire_message_slot mapping), then walks buckets backward (default) or
     * forward — one Photon query per bucket, with a seen-set, stopping at
     * `limit`, bucket 0 / the newest bucket, or `maxBuckets`.
     *
     * The merged result is sorted by globalSeq ascending. With `decrypt`
     * (default true) epoch keys are recovered once per cryptoEpoch (newest
     * first, so older epochs of the same segment chain-derive cheaply) before
     * messages decrypt with bounded concurrency. With `includeContent`, external
     * content of decrypted messages is fetched with the same concurrency bound.
     */
    async loadMessages(options: RoomLoadMessagesOptions = {}): Promise<RoomMessageClient[]> {
        await this.roomClient.refresh();
        const room = this.roomClient.Room;

        const limit = options.limit ?? ROOM_MESSAGE_BUCKET_SIZE;
        const direction = options.direction ?? "backward";
        const maxBuckets = options.maxBuckets ?? 5;

        if (limit <= 0 || room.globalLen.isZero()) {
            return [];
        }

        // Highest globalSeq to include.
        let maxSeq = room.globalLen;
        if (options.beforeSeq !== undefined) {
            const beforeSeq = toBN(options.beforeSeq);
            if (beforeSeq.lten(1)) {
                return [];
            }
            maxSeq = BN.min(maxSeq, beforeSeq.subn(1));
        }

        const lastBucket = roomBucketForSeq(maxSeq);
        const seen = new Set<string>();
        const collected: RoomMessageClient[] = [];

        let bucket = direction === "backward" ? lastBucket : 0;

        for (let i = 0; i < maxBuckets; i++) {
            if (bucket < 0 || bucket > lastBucket) {
                break;
            }

            const items = await this.loadBucket(bucket, {
                force: options.force,
                currentBucketTtlMs: options.currentBucketTtlMs,
            });

            const eligible = items.filter((msg) => msg.Message.globalSeq.lte(maxSeq));
            const ordered = direction === "backward" ? [...eligible].reverse() : eligible;

            for (const msg of ordered) {
                const key = msg.address.toBase58();
                if (seen.has(key)) continue;
                seen.add(key);
                collected.push(msg);
                if (collected.length >= limit) break;
            }

            if (collected.length >= limit) {
                break;
            }

            bucket += direction === "backward" ? -1 : 1;
        }

        collected.sort((a, b) => a.Message.globalSeq.cmp(b.Message.globalSeq));

        const concurrency = Math.max(1, options.concurrentFetchLimit ?? 10);

        if ((options.decrypt ?? true) && collected.length > 0) {
            // One recovery per epoch, newest first: older epochs of the same
            // segment are then derived by cheap backward chain steps.
            const epochs = new Map<string, BN>();
            for (const msg of collected) {
                epochs.set(msg.Message.cryptoEpoch.toString(), msg.Message.cryptoEpoch);
            }
            const sortedEpochs = [...epochs.values()].sort((a, b) => b.cmp(a));
            for (const epoch of sortedEpochs) {
                try {
                    await this.roomClient.recoverEpochKey(epoch);
                } catch {
                    // per-message decrypt() reports the failure as a typed result
                }
            }

            for (let i = 0; i < collected.length; i += concurrency) {
                await Promise.all(collected.slice(i, i + concurrency).map((msg) => msg.decrypt()));
            }
        }

        // `parse` implies `includeContent`: parsing needs the fetched blob.
        if (options.includeContent || options.parse) {
            for (let i = 0; i < collected.length; i += concurrency) {
                await Promise.all(collected.slice(i, i + concurrency).map(async (msg) => {
                    const decrypted = await msg.decrypt();
                    if (decrypted.status !== "decrypted") return;
                    try {
                        if (options.parse) {
                            // Primes the handle's content and parsed caches.
                            await msg.loadParsedContent();
                        } else {
                            await msg.loadContent();
                        }
                    } catch {
                        // external fetch/parse failure must not fail the whole page
                    }
                }));
            }
        }

        return collected;
    }

    /**
     * Like `loadMessages`, but returns render-ready `RoomLoadedMessage` structs
     * (status + handle + decrypted pointer + resolved `loaded`/`parsed` content)
     * for callers that want resolved content in one call. Forces `parse: true`,
     * so each decrypted item carries `parsed`; `text` stays the raw pointer.
     */
    async loadMessagesResolved(options: RoomLoadMessagesOptions = {}): Promise<RoomLoadedMessage[]> {
        const handles = await this.loadMessages({ ...options, parse: true });
        return Promise.all(handles.map(async (handle) => {
            const decrypted = handle.Decrypted ?? await handle.decrypt();
            const resolved = decrypted.status === "decrypted"
                ? {
                    // Primed by loadParsedContent above; re-read without re-fetch.
                    loaded: safeContent(handle),
                    parsed: handle.Parsed,
                }
                : undefined;
            return toRoomLoadedMessage(handle, decrypted, resolved);
        }));
    }

    /**
     * Cursor-based Photon scan over ALL of this room's messages (direct room
     * memcmp), for non-bucket use cases (e.g. full export). Decrypts each page
     * through the shared per-message handles.
     */
    async loadMessagesByScan(params: RoomLoadMessagesByScanParams = {}): Promise<RoomLoadMessagesByScanResult> {
        const page = await GetRoomMessagesByRoom({
            client: this.client,
            room: this.roomClient.address,
            sender: params.sender,
            cursor: params.cursor,
            limit: params.limit,
        });

        const items: RoomLoadedMessage[] = [];
        for (const data of page.items) {
            const handle = this.handleFor(data);
            items.push(toRoomLoadedMessage(handle, await handle.decrypt()));
        }

        return { items, cursor: page.cursor };
    }

    /** Reuse the cached handle for an address (decrypt/content caches survive). */
    private handleFor(data: RoomMessageData): RoomMessageClient {
        const existing = this.handles.get(data.address);
        if (existing) {
            return existing.loadFromData(data);
        }

        return this.handles.set(
            data.address,
            RoomMessageClient.Handle({ roomClient: this.roomClient, data }),
        );
    }

    private async loadMessageRetrying(address: PublicKey, retries = 3, delay = 400): Promise<RoomMessageData | null> {
        for (let i = 0; i < retries; i++) {
            try {
                const message = await GetRoomMessageAccount(this.client, address);
                if (message) return message;
            } catch {
                // indexer lag — retry
            }
            if (i < retries - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        return null;
    }
}

function toRoomLoadedMessage(
    handle: RoomMessageClient,
    result: RoomMessageDecryptResult,
    resolved?: { loaded?: PacketLoadedContent; parsed?: ParsedPacketMessageContent },
): RoomLoadedMessage {
    switch (result.status) {
        case "decrypted":
            return {
                message: handle.Message,
                handle,
                status: "decrypted",
                content: result.content,
                text: result.text,
                loaded: resolved?.loaded,
                parsed: resolved?.parsed,
            };
        case "locked":
            return { message: handle.Message, handle, status: "locked" };
        case "failed":
            return { message: handle.Message, handle, status: "failed", error: result.error };
    }
}

/** Read a handle's loaded content without throwing when it was never fetched. */
function safeContent(handle: RoomMessageClient): PacketLoadedContent | undefined {
    try {
        return handle.Content;
    } catch {
        return undefined;
    }
}

function tryText(bytes: Bytes): string | undefined {
    try {
        return text(bytes);
    } catch {
        return undefined;
    }
}
