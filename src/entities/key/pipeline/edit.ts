import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";

import type { PipelineBase } from "../../../types/client";
import type { EditUserKeyParams } from "../types";
import type { Rpc } from "@lightprotocol/stateless.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";
import { EditKeyIx } from "../instructions/edit";

export type EditKeyPipelineResult = {
    pipeline: PipelineBase
}

export const EditKeyPipeline = async (
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: EditUserKeyParams = {},
    options?: PacketIxOptions & PacketTxOptions
) => {
    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<EditKeyPipelineResult> = {};

    const ix = await EditKeyIx(
        rpc,
        signer,
        program,
        params,
        options
    );

    pipeline.instruction = ix;

    result.pipeline = pipeline as PipelineBase;

    return result as EditKeyPipelineResult;
}