import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import type { Escrow, TokenProgramType } from "../payment/types";

export interface Thread {
    address: PublicKey,
    id: number,
    from: PublicKey,
    to: PublicKey,
    inboxId?: BN,
    totalMsgs: number,
    lastMsgSeq: number,
    lastUpdated: number,
    lastSenderSide: number, //0 for from, 1 for to
    lastReadSeqFrom: number,
    lastReadSeqTo: number,
    escrowPayment: ThreadEscrowInfo | null
}

export interface ThreadInfo {
    id: number,
    from: PublicKey,
    to: PublicKey,
    inboxId?: BN,
}

export type ThreadEscrowInfo = {
    senderApproval: boolean,
    receiverApproval: boolean,
    releaseTime: number | null,
    released: boolean
    amount: BN,
    mint: PublicKey,
    tokenProgram: TokenProgramType
    escrow: Escrow
}