import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";

import type { PipelineBase } from "../../../types/client.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { EditUserIx, type EditUserParams } from "../../index.js";

export type EditUserPipelineResult = {
    pipeline: PipelineBase
}

export const EditUserPipeline = async (
    signer: PublicKey,
        program: PacketProgram,
        params: EditUserParams,
    options?: PacketIxOptions & PacketTxOptions
) => {
    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<EditUserPipelineResult> = {};

    const ix = await EditUserIx(
        signer,
        program,
        params,
        options
    );

    pipeline.instruction = ix;

    result.pipeline = pipeline as PipelineBase;

    return result as EditUserPipelineResult;
}