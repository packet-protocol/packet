import { Connection, PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program";
import { RoomSendMessageIx, type RoomSendMessageIxParams } from "../instructions/send-message";
import type { PipelineBase } from "../../../types/client";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";

export type RoomSendMessagePipelineResult = {
    pipeline: PipelineBase
}

export const RoomSendMessagePipeline = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomSendMessageIxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<RoomSendMessagePipelineResult> = {};

    const ix = await RoomSendMessageIx(connection, rpc, signer, program, params, options);

    pipeline.instruction = ix;

    result.pipeline = pipeline as PipelineBase;

    return result as RoomSendMessagePipelineResult;
}
