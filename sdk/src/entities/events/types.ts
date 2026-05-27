import type {
    Finality,
    TransactionResponse,
    VersionedTransactionResponse,
} from "@solana/web3.js";

export type PacketEventSubscription = {
    id: number;
    stop: () => Promise<void>;
};


export type AnchorCpiDecodedEvent<TData = unknown> = {
    name: string;
    data: TData;
    slot: number;
    signature: string;
    tx: TransactionResponse | VersionedTransactionResponse | any;
};

export type AnchorCpiEventContext = {
    slot: number;
    signature: string;
    tx: TransactionResponse | VersionedTransactionResponse | any;
};

export type AnchorCpiEventSubscription = {
    id: number;
    stop: () => Promise<void>;
};

export type AnchorCpiEventListenerParams<TRaw = unknown, TParsed = TRaw> = {

    /**
     * Anchor event name(s) to listen for. If not specified, all events will be listened to.
     */
    eventName?: string[];

    /**
     * Convert raw Anchor event data into your SDK-level event shape.
     * Return null/undefined to drop it.
     */
    parse?: (
        raw: TRaw,
        ctx: AnchorCpiEventContext,
        decoded: AnchorCpiDecodedEvent<TRaw>,
    ) => TParsed | null | undefined | Promise<TParsed | null | undefined>;

    /**
     * Optional app-level filter.
     */
    filter?: (
        parsed: TParsed,
        ctx: AnchorCpiEventContext,
        decoded: AnchorCpiDecodedEvent<TRaw>,
    ) => boolean | Promise<boolean>;

    /**
     * Final callback.
     */
    onEvent: (
        parsed: TParsed,
        ctx: AnchorCpiEventContext,
        decoded: AnchorCpiDecodedEvent<TRaw>,
    ) => void | Promise<void>;

    onError?: (error: unknown) => void;

    commitment?: Finality;
    maxRetries?: number;
};