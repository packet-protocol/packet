import { type Connection, type PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import {type CreateRoomIxParams } from "../instructions/create";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";
import { HandleTxPipeline } from "../../..";
import { CreateRoomPipeline } from "../pipeline/create";

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