import { Rpc } from "@lightprotocol/stateless.js";
import { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import { CreateThreadIx } from "../instructions/create.js";
import type { CreateMessageInputAndAccountsParams } from "../../message/instructions/resolve.js";
import type { PipelineBase } from "../../../types/client.js";
import { InboxKind } from "../../inbox/types.js";
import { ArchiveInboxIx } from "../../inbox/instructions/archive.js";
import { InboxClient } from "../../index.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";

export type CreateThreadPipelineResult = {
    pipeline: PipelineBase
}

export const CreateThreadPipeline = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateMessageInputAndAccountsParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<CreateThreadPipelineResult> = {};

    if (params.targetInbox && params.targetInbox.kind === InboxKind.Standard && !params.skipInboxArchivalIx) {
        if (!(params.targetInbox.len.eqn(0)) && params.targetInbox.len.gte(InboxClient.InboxArchiveThreshold)) {
            const ix = await ArchiveInboxIx(
                rpc,
                signer,
                program,
                params.targetInbox,
                true
            );
            pipeline.preInstructions = pipeline.preInstructions ?? [];

            pipeline.preInstructions.push({
                instructions: [ix],
                computeUnits: 200_000,
                isTxGroup: true
            });
        }
    }

    // 2) Thread
    const threadIxs = await CreateThreadIx(
        connection,
        rpc,
        signer,
        program,
        params,
        options
    )

    pipeline.instruction = threadIxs;

    result.pipeline = pipeline as PipelineBase;

    return result as CreateThreadPipelineResult;
}