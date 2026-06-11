import { Connection, PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program";
import { RoomPublishHeaderIx, type RoomPublishHeaderIxParams } from "../instructions/publish-header";
import type { PipelineBase } from "../../../types/client";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";

export type RoomPublishHeaderPipelineResult = {
    pipeline: PipelineBase
}

export const RoomPublishHeaderPipeline = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomPublishHeaderIxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<RoomPublishHeaderPipelineResult> = {};

    const ix = await RoomPublishHeaderIx(connection, rpc, signer, program, params, options);

    pipeline.instruction = ix;

    result.pipeline = pipeline as PipelineBase;

    return result as RoomPublishHeaderPipelineResult;
}
