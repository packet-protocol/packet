import {
    Connection,
    PublicKey,
} from "@solana/web3.js";
import type { Rpc } from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program.js";
import type { EditUserKeyParams } from "../types.js";
import { EditKeyPipeline } from "../pipeline/edit.js";
import { HandleTxPipeline } from "../../../utils/index.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";

export async function EditKeyTx(
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: EditUserKeyParams = {},
    options?: PacketIxOptions & PacketTxOptions
) {

    let computeUnits = 200_000;

    // pipeline
    const { pipeline } = await EditKeyPipeline(
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