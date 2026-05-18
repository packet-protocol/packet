import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";

import type { PipelineBase } from "../../../types/client";
import type { Rpc } from "@lightprotocol/stateless.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";
import { CreateUserIx } from "../instructions/create";
import type { CreateUserParams } from "../..";

export type CreateUserPipelineResult = {
    pipeline: PipelineBase
}

export const CreateUserPipeline = async (
    signer: PublicKey,
    program: PacketProgram,
    params: CreateUserParams,
    options?: PacketIxOptions & PacketTxOptions
) => {
    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<CreateUserPipelineResult> = {};

    const ix = await CreateUserIx(
        signer,
        program,
        params,
        options
    );

    pipeline.instruction = ix;

    result.pipeline = pipeline as PipelineBase;

    return result as CreateUserPipelineResult;
}