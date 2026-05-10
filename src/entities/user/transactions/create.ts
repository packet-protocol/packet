import {
    Connection,
    PublicKey,
} from "@solana/web3.js";

import type { PacketProgram } from "../../../providers/program";
import type { CreateUserParams } from "../types";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";
import { CreateUserPipeline } from "../pipeline/create";
import { HandleTxPipeline } from "../../..";

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