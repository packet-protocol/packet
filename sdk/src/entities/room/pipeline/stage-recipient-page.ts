import { Connection, PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program";
import { RoomStageRecipientPageIx, type RoomStageRecipientPageIxParams } from "../instructions/stage-recipient-page";
import type { PipelineBase } from "../../../types/client";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";

export type RoomStageRecipientPagePipelineResult = {
    pipeline: PipelineBase
}

export const RoomStageRecipientPagePipeline = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomStageRecipientPageIxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<RoomStageRecipientPagePipelineResult> = {};

    const ix = await RoomStageRecipientPageIx(connection, rpc, signer, program, params, options);

    pipeline.instruction = ix;

    result.pipeline = pipeline as PipelineBase;

    return result as RoomStageRecipientPagePipelineResult;
}
