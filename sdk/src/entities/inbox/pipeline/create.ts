import { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import { CreateInboxIx, type CreateInboxParams } from "../instructions/create.js";
import type { PipelineBase } from "../../../types/client.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";

export type CreateInboxPipelineResult = {
    pipeline: PipelineBase
}

export const CreateInboxPipeline = async (
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateInboxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<CreateInboxPipelineResult> = {};

    const ixs = await CreateInboxIx(connection, signer, program, params, options);

    pipeline.instruction = ixs;

    result.pipeline = pipeline as PipelineBase;

    return result as CreateInboxPipelineResult;
}