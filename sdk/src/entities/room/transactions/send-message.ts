import { type Connection, type PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program.js";
import { type RoomSendMessageIxParams } from "../instructions/send-message.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { HandleTxPipeline } from "../../../index.js";
import { RoomSendMessagePipeline } from "../pipeline/send-message.js";

export const RoomSendMessageTx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomSendMessageIxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let computeUnits = 400_000;

    // pipeline
    const { pipeline } = await RoomSendMessagePipeline(
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
