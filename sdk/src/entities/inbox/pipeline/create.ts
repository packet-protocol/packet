import { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { CreateInboxIx, type CreateInboxParams } from "../instructions/create";
import type { PipelineBase } from "../../../types/client";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";

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