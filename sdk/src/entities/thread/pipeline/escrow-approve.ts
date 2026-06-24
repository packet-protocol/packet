import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";

import type { PipelineBase } from "../../../types/client.js";
import type { Thread } from "../types.js";
import { EscrowApproveIx } from "../instructions/escrow-approve.js";
import type { Rpc } from "@lightprotocol/stateless.js";
import type { PacketIxOptions } from "../../transaction/types.js";

export type EscrowApprovePipelineResult = {
    pipeline: PipelineBase
}

export const EscrowApprovePipeline = async (
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    thread: Thread,
    options?: PacketIxOptions,
) => {
    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<EscrowApprovePipelineResult> = {};

    const ix = await EscrowApproveIx(
        rpc,
        signer,
        program,
        thread,
        options,
    );

    pipeline.instruction = ix;

    result.pipeline = pipeline as PipelineBase;

    return result as EscrowApprovePipelineResult;
}