import { type Connection, type PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import {type CreateRoomIxParams } from "../instructions/create.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { HandleTxPipeline } from "../../../index.js";
import { CreateRoomPipeline } from "../pipeline/create.js";

export const CreateRoomTx = async (
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateRoomIxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let computeUnits = 200_000;

    // pipeline
    const { pipeline } = await CreateRoomPipeline(
        connection,
        signer,
        program,
        params,
        options
    );

    // main tx
    const txs = await HandleTxPipeline(pipeline, {
        connection,
        payer: signer,
        computeUnits,
        priorityFee: options?.priorityFee,
        lookupTables: options?.lookupTables
    });

    return txs;
}