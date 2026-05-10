import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";

import type { PipelineBase } from "../../../types/client";
import type { CreateUserKeyParams } from "../types";
import type { Rpc } from "@lightprotocol/stateless.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";
import { CreateKeyIx } from "../instructions/create";

export type CreateKeyPipelineResult = {
    pipeline: PipelineBase
}

export const CreateKeyPipeline = async (
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateUserKeyParams = {},
    options?: PacketIxOptions & PacketTxOptions
) => {
    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<CreateKeyPipelineResult> = {};

    const ix = await CreateKeyIx(
        rpc,
        signer,
        program,
        params,
        options
    );

    pipeline.instruction = ix;

    result.pipeline = pipeline as PipelineBase;

    return result as CreateKeyPipelineResult;
}