import { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import { CreateRoomIx, type CreateRoomIxParams } from "../instructions/create.js";
import type { PipelineBase } from "../../../types/client.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";

export type CreateRoomPipelineResult = {
    pipeline: PipelineBase
}

export const CreateRoomPipeline = async (
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateRoomIxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<CreateRoomPipelineResult> = {};

    const ixs = await CreateRoomIx(connection, signer, program, params, options);

    pipeline.instruction = ixs;

    result.pipeline = pipeline as PipelineBase;

    return result as CreateRoomPipelineResult;
}