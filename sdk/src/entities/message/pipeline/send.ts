import { Rpc } from "@lightprotocol/stateless.js";
import { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { SendMsgIx } from "../instructions/send";
import type { CreateMessageInputAndAccountsParams } from "../instructions/resolve";
import type { PipelineBase } from "../../../types/client";
import { InboxClient, InboxKind } from "../../inbox";
import { ArchiveInboxIx } from "../../inbox/instructions/archive";
import type { PacketIxOptions } from "../../transaction/types";

export type SendMsgPipelineResult = {
    pipeline: PipelineBase
}

export const SendMsgPipeline = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateMessageInputAndAccountsParams,
    options?: PacketIxOptions
) => {
    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<SendMsgPipelineResult> = {};

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
            });
        }
    }


    // 3) Message
    const messageIxs = await SendMsgIx(
        connection,
        rpc,
        signer,
        program,
        params,
        options
    )

    pipeline.instruction = messageIxs;

    result.pipeline = pipeline as PipelineBase;

    return result as SendMsgPipelineResult;
}