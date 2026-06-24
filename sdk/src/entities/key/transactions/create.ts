import {
    Connection,
    PublicKey,
} from "@solana/web3.js";
import type { Rpc } from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program.js";
import type { CreateUserKeyParams } from "../types.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { HandleTxPipeline } from "../../../index.js";
import { CreateKeyPipeline } from "../pipeline/create.js";

export async function CreateKeyTx(
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateUserKeyParams = {},
    options?: PacketIxOptions & PacketTxOptions
) {

    let computeUnits = 200_000;

    // pipeline
    const { pipeline } = await CreateKeyPipeline(
        rpc,
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