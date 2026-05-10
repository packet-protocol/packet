import {
    Connection,
    PublicKey,
} from "@solana/web3.js";
import type { Rpc } from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program";
import type { EditUserKeyParams } from "../types";
import { EditKeyPipeline } from "../pipeline/edit";
import { HandleTxPipeline } from "../../../utils";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";

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