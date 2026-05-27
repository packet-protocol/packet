import type { AccountInfo, Finality, PublicKey } from "@solana/web3.js";
import type { Segment } from "../segment/types";
import type { PaymentRule } from "../payment/types";
import type BN from "bn.js";
import type { InboxClient } from "../..";

export interface Inbox {
    address: PublicKey,
    kind: InboxKind,
    owner: PublicKey,
    id: BN,
    index: BN,
    len: BN
    lastUpdated: number,
    paymentRule: PaymentRule | null
}

export interface InboxArchive {
    owner: PublicKey,
    id: BN,
    index: BN,
    raw: Segment 
}

export interface InboxBody {
    raw: Segment 
}

export interface InboxMetadata {
    name: string,
    uri: string
}

export enum InboxKind {
    Standard = 0,
    Ephemeral = 1
}

export type InboxChangedEvent = {
    address: PublicKey;
    previous: Inbox;
    inbox: Inbox;
    slot: number;
    accountInfo: AccountInfo<Buffer>;
};

export type ListenInboxEventsParams = {
    /**
     * Default: "confirmed"
     */
    commitment?: Finality;

    /**
     * If true, clears cached body/archive page clients when inbox account changes.
     */
    clearPages?: boolean;

    /**
     * Optional app-level filter. Return false to suppress onChange.
     */
    filter?: (event: InboxChangedEvent) => boolean | Promise<boolean>;

    onChange: (client: InboxClient, event: InboxChangedEvent) => void | Promise<void>;

    onError?: (error: unknown) => void;
};