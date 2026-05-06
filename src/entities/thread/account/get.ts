import * as anchor from "@coral-xyz/anchor";
import type { Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program";
import type { Connection, PublicKey } from "@solana/web3.js";
import { getLightPdaStatus, LightPdaStatus } from "../../../providers/light/light-pda/status";
import type { PacketIDL } from "../../../idl/packet.idl";
import type { Thread } from "../types";
import { ParseThreadEscrowInfoOption } from "../../payment/parse";

export const GetThreadAccount = async (
    connection: Connection,
    rpc: Rpc,
    program: PacketProgram,
    address: PublicKey
) => {

    const account = await getLightPdaStatus({
        connection,
        rpc,
        programId: program.programId,
        pda: address,
    });

    if (account.status === LightPdaStatus.Missing) {
        return null;
    }

    const coder = new anchor.BorshCoder(program.idl);

    let decoded: anchor.IdlAccounts<PacketIDL>["thread"];

    if (account.status === LightPdaStatus.Hot) {
        let data = Uint8Array.from(account.hotAccount!.data);
        decoded = coder.types.decode("thread", Buffer.from(data.slice(8)));
    } else {
        decoded = coder.types.decode("thread", account.compressedAccount!.data.data);
    }

    return {
        status: account.status,
        address: account.pda,
        compressedAddress: account.compressedAddress,
        data: decoded,
    }

}

export const ThreadAccountToThread = (account: anchor.IdlAccounts<PacketIDL>["thread"], address: PublicKey): Thread => {
    return {
        address: address,
        id: account.id,
        from: account.from,
        to: account.to,
        inboxId: account.inboxId,
        totalMsgs: account.totalMsgs,
        lastMsgSeq: account.lastMsgSeq,
        lastUpdated: account.lastUpdated.toNumber(),
        lastSenderSide: account.lastSenderSide,
        lastReadSeqFrom: account.lastReadSeqFrom,
        lastReadSeqTo: account.lastReadSeqTo,
        escrowPayment: ParseThreadEscrowInfoOption(account.escrowPayment)
    }
}