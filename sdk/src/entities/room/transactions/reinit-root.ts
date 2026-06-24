import { type Connection, type PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import { type RoomReinitRootIxParams } from "../instructions/reinit-root.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { HandleTxPipeline } from "../../../index.js";
import { RoomReinitRootPipeline } from "../pipeline/reinit-root.js";

export const RoomReinitRootTx = async (
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomReinitRootIxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let computeUnits = 200_000;

    // pipeline
    const { pipeline } = await RoomReinitRootPipeline(
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
