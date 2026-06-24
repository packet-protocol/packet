import * as anchor from "@anchor-lang/core";
import { bn, type Rpc } from "@lightprotocol/stateless.js";
import { type PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import type { PacketIDL } from "../../../idl/packet.idl.js";
import type { Message } from "../types.js";
import { AnchorEnumToMessageType } from "../utils/helpers.js";

export const GetMessageAccount = async (
    rpc: Rpc,
    program: PacketProgram,
    address: PublicKey
) => {
    const account = await rpc.getCompressedAccount(bn(address.toBytes()));

    if (!account || !account.data) {
        return null;
    }

    const coder = new anchor.BorshCoder(program.idl);
    
    let decoded: anchor.IdlEvents<PacketIDL>["message"] = coder.types.decode("message", account.data.data);

    return {
        address: address,
        data: decoded,
    }
}

export const MessageAccountToMessage = (account: anchor.IdlEvents<PacketIDL>["message"]): Message => {
    return {
        threadId: account.threadId,
        msgSeq: account.msgSeq,
        senderSide: account.senderSide as 0 | 1,
        timestamp: account.timestamp.toNumber(),
        payment: account.payment,
        messageType: AnchorEnumToMessageType(account.messageType),
        content: Buffer.from(account.content),
    }
}