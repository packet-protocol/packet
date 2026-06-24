import type { Connection, PublicKey } from "@solana/web3.js";
import type { PacketIxOptions, PacketProgram } from "../../../index.js";
import type { Bytes } from "../../../types/common.js";
import * as Pda from "../../../pda.js";

export type CreateRoomIxParams = {
    /* 32 byte */
    roomId: Bytes;

    paramsId: Bytes;
    paramsRoot: Bytes;
}

export const CreateRoomIx = async (
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateRoomIxParams,
    options?: PacketIxOptions,
) => {
    const owner = options?.owner ?? signer;

    const ix = await program.methods.roomCreate(
        Array.from(params.roomId),
        Array.from(params.paramsId),
        Array.from(params.paramsRoot),
    ).accounts({
        signer: signer,
        sender: owner,
        permit: options?.permit ?? null,
    }).instruction();

    return ix;
}