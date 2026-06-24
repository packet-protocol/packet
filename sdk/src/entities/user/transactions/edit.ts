import {
    Connection,
    PublicKey,
} from "@solana/web3.js";

import type { PacketProgram } from "../../../providers/program.js";
import type { EditUserParams } from "../types.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { EditUserPipeline } from "../pipeline/edit.js";
import { HandleTxPipeline } from "../../../index.js";

export async function EditUserTx(
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: EditUserParams,
    options?: PacketIxOptions & PacketTxOptions
) {
    let computeUnits = 200_000;

    // pipeline
    const { pipeline } = await EditUserPipeline(
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