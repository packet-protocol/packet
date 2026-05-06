import type { PublicKey } from "@solana/web3.js";
import type { Segment } from "../segment/types";
import type { PaymentRule } from "../payment/types";
import type BN from "bn.js";

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