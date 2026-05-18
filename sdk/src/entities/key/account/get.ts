import { PublicKey } from "@solana/web3.js";
import { bn, type Rpc } from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program";
import * as Pda from "../../../pda";
import { anchorKeyTypeToPacketKeyType } from "../utils";
import type { UserDecryptionKey } from "../types";

type LoadedCompressedKey = {
    address: PublicKey;
    compressedAccount: NonNullable<Awaited<ReturnType<Rpc["getCompressedAccount"]>>>;
    data: UserDecryptionKey;
    rawAccount: any;
};

function decodeUserDecryptionKey(
    program: PacketProgram,
    data: Uint8Array,
): any {
    const buffer = Buffer.from(data);

    try {
        return program.coder.types.decode("UserDecryptionKey", buffer);
    } catch {}

    try {
        return program.coder.types.decode("userDecryptionKey", buffer);
    } catch {}

    try {
        const event = program.coder.events.decode(buffer.toString("base64"));

        if (event?.name === "UserDecryptionKey" || event?.name === "userDecryptionKey") {
            return event.data;
        }
    } catch {}

    throw new Error("Failed to decode UserDecryptionKey compressed account");
}

export async function GetUserKeyAccount(params: {
    rpc: Rpc;
    program: PacketProgram;
    owner: PublicKey;
}): Promise<LoadedCompressedKey | null> {
    const address = Pda.keyPda(params.owner, params.program.programId);

    const compressedAccount = await params.rpc.getCompressedAccount(
        bn(address.toBytes()),
    );

    if (!compressedAccount || !compressedAccount.data?.data) {
        return null;
    }

    const rawAccount = decodeUserDecryptionKey(
        params.program,
        compressedAccount.data.data,
    );

    return {
        address,
        compressedAccount,
        rawAccount,
        data: {
            address,
            owner: rawAccount.owner,
            keyType: anchorKeyTypeToPacketKeyType(rawAccount.keyType),
            key: Uint8Array.from(rawAccount.key),
        },
    };
}