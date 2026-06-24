import { type Connection, type PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program.js";
import { type RoomPublishHeaderIxParams } from "../instructions/publish-header.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { HandleTxPipeline } from "../../../index.js";
import { RoomPublishHeaderPipeline } from "../pipeline/publish-header.js";

export const RoomPublishHeaderTx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomPublishHeaderIxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let computeUnits = 400_000;

    // pipeline
    const { pipeline } = await RoomPublishHeaderPipeline(
        connection,
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
