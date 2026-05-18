import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import type { Escrow, TokenProgramType } from "../payment/types";
import type { PacketIDL } from "../../idl/packet.idl";
import * as anchor from "@coral-xyz/anchor";
export interface Thread {
    address: PublicKey;
    version: number;
    id: number;
    from: PublicKey;
    to: PublicKey;
    inboxId: BN;
    totalMsgs: number;
    lastMsgSeq: number;
    lastUpdated: number;
    lastSenderSide: number;
    lastReadSeqFrom: number;
    lastReadSeqTo: number;
    escrowPayment: ThreadEscrowInfo | null;
}

export interface ThreadInfo {
    id: number;
    from: PublicKey;
    to: PublicKey;
    inboxId?: BN;
}

export type ThreadEscrowInfo = {
    senderApproval: boolean;
    receiverApproval: boolean;
    releaseTime: BN;
    released: boolean;
    amount: BN;
    mint: PublicKey;
    tokenProgram: TokenProgramType;
    escrow: Escrow;
};

export type ThreadAccountData = anchor.IdlEvents<PacketIDL>["thread"];