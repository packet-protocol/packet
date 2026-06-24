import * as anchor from "@anchor-lang/core";
import { bn, type Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program.js";
import { PublicKey } from "@solana/web3.js";
import type { Thread, ThreadAccountData } from "../types.js";
import { ParseThreadEscrowInfoOption } from "../../payment/parse.js";
import {
    getMultipleCompressedAccountsByAddressChunked,
} from "../../../providers/light/compressed.js";
import * as Pda from "../../../pda.js";



export type DecodedThreadAccount = {
    address: PublicKey;
    compressedAccount: any;
    data: ThreadAccountData;
};



export function DecodeThreadAccountData(
    program: PacketProgram,
    data: Uint8Array | Buffer | string,
): ThreadAccountData {
    const raw =
        typeof data === "string"
            ? Buffer.from(data, "base64")
            : Buffer.from(data);

    const coder = new anchor.BorshCoder(program.idl);

    return coder.types.decode(
        "thread",
        raw,
    ) as ThreadAccountData;
}

export function DecodeThreadOwnerAccountItem(params: {
    program: PacketProgram;
    item: {
        address?: string | PublicKey | null;
        data?: {
            data?: string | Uint8Array | Buffer;
        } | null;
        [key: string]: any;
    };
}): DecodedThreadAccount | null {
    if (!params.item.data?.data) {
        return null;
    }

    const decoded = DecodeThreadAccountData(
        params.program,
        params.item.data.data,
    );

    const threadId = decoded.id;

    return {
        address: params.item.address
            ? new PublicKey(params.item.address)
            : Pda.threadPda(threadId, params.program.programId),
        compressedAccount: params.item,
        data: decoded,
    };
}

export const GetThreadAccount = async (
    rpc: Rpc,
    program: PacketProgram,
    address: PublicKey,
) => {
    const account = await rpc.getCompressedAccount(bn(address.toBytes()));

    if (!account?.data) {
        return null;
    }

    const decoded = DecodeThreadAccountData(
        program,
        account.data.data,
    );

    return {
        address,
        compressedAccount: account,
        data: decoded,
    };
};

export const GetThreadAccounts = async (
    rpc: Rpc,
    program: PacketProgram,
    addresses: PublicKey[],
    accountBatchSize?: number,
) => {
    const uniqueAddresses = Array.from(
        new Map(addresses.map((pda) => [pda.toBase58(), pda])).values(),
    );

    const compressedAccounts = await getMultipleCompressedAccountsByAddressChunked(
        rpc,
        uniqueAddresses,
        accountBatchSize || 10,
    );

    const results: DecodedThreadAccount[] = [];

    for (let i = 0; i < compressedAccounts.length; i++) {
        const account = compressedAccounts[i];

        if (!account?.data) {
            continue;
        }

        const decoded = DecodeThreadAccountData(
            program,
            account.data.data,
        );

        results.push({
            address: uniqueAddresses[i],
            compressedAccount: account,
            data: decoded,
        });
    }

    return results;
};

export const ThreadAccountToThread = (
    account: ThreadAccountData,
    address: PublicKey,
): Thread => {
    return {
        address,
        version: account.version,
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
        escrowPayment: ParseThreadEscrowInfoOption(account.escrowPayment),
    };
};