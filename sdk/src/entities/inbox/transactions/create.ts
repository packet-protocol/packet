import { type Connection, type PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import { type CreateInboxParams } from "../instructions/create.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { CreateInboxPipeline } from "../pipeline/create.js";
import { HandleTxPipeline } from "../../../index.js";

export const CreateInboxTx = async (
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateInboxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let computeUnits = 300_000;

    // pipeline
    const { pipeline } = await CreateInboxPipeline(
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