import {
    Connection,
    PublicKey,
} from "@solana/web3.js";

import type { PacketProgram } from "../../../providers/program";
import type { EditUserParams } from "../types";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";
import { EditUserPipeline } from "../pipeline/edit";
import { HandleTxPipeline } from "../../..";

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