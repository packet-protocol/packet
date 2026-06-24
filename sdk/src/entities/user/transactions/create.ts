import {
    Connection,
    PublicKey,
} from "@solana/web3.js";

import type { PacketProgram } from "../../../providers/program.js";
import type { CreateUserParams } from "../types.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { CreateUserPipeline } from "../pipeline/create.js";
import { HandleTxPipeline } from "../../../index.js";

export async function CreateUserTx(
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateUserParams,
    options?: PacketIxOptions & PacketTxOptions
) {
    let computeUnits = 200_000;

    // pipeline
    const { pipeline } = await CreateUserPipeline(
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