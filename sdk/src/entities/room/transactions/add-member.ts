import { type Connection, type PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program";
import { type RoomAddMemberIxParams } from "../instructions/add-member";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";
import { HandleTxPipeline } from "../../..";
import { RoomAddMemberPipeline } from "../pipeline/add-member";

export const RoomAddMemberTx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomAddMemberIxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let computeUnits = 400_000;

    // pipeline
    const { pipeline } = await RoomAddMemberPipeline(
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
