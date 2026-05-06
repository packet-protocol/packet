import { Rpc } from "@lightprotocol/stateless.js";
import BN from "bn.js";
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { LightPdaStatus, type LightPdaNonHotStatus } from "../../../providers/light/light-pda/status";
import { CreateOrLoadActivityIfNeededIx } from "../../activity/instructions/create-or-load";
import { CreateThreadIx } from "../instructions/create";
import type { CreateMessageInputAndAccountsParams } from "../../message/instructions/resolve";
import type { PipelineBase, PipelineIxs } from "../../../types/client";
import { InboxKind, type Inbox } from "../../inbox/types";
import { ArchiveInboxIx } from "../../inbox/instructions/archive";

export type CreateThreadPipelineResult = {
    fromActivity?: {
        status: LightPdaNonHotStatus;
    },
    toActivity?: {
        status: LightPdaNonHotStatus;
    },
    pipeline: PipelineBase
}

export const CreateThreadPipeline = async (
    connection: Connection,
    rpc: Rpc,
    sender: PublicKey,
    program: PacketProgram,
    params: CreateMessageInputAndAccountsParams,
) => {
    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<CreateThreadPipelineResult> = {};


    if (!params.skipActivityCreation) {
        const fromActivity = await CreateOrLoadActivityIfNeededIx(connection, rpc, sender, sender, program);
        const toActivity = await CreateOrLoadActivityIfNeededIx(connection, rpc, sender, params.threadInfo.to, program);

        const activityTxs: PipelineIxs = { instructions: [] };

        if (fromActivity.status !== LightPdaStatus.Hot) {
            result.fromActivity = { status: fromActivity.status, }
            activityTxs.instructions.push(fromActivity.instruction);
        }
        if (toActivity.status !== LightPdaStatus.Hot) {
            result.toActivity = { status: toActivity.status }
            activityTxs.instructions.push(toActivity.instruction);
        }

        if (activityTxs.instructions.length > 0) {
            if (params.threadInfo.from.equals(params.threadInfo.to)) {
                delete result.toActivity;
                if (activityTxs.instructions.length > 1) {
                    activityTxs.instructions.splice(1, 1);
                }
            }
            activityTxs.isTxGroup = true;
            activityTxs.computeUnits = 400_000 + activityTxs.instructions.length * 150_000;
            pipeline.preInstructions = [activityTxs];
        }
    }

    if (params.targetInbox && params.targetInbox.kind === InboxKind.Standard && !params.skipInboxArchivalIx) {
        if (shouldIncludeArchiveInThreadCreation(params.targetInbox)) {
            const ix = await ArchiveInboxIx(
                rpc,
                sender,
                program,
                params.targetInbox,
                true
            );
            pipeline.preInstructions = pipeline.preInstructions ?? [];
            pipeline.preInstructions.push({
                instructions: [ix],
                computeUnits: 150_000,
            });
        }
    }

    // 2) Thread
    const threadIxs = await CreateThreadIx(
        connection,
        rpc,
        sender,
        program,
        params
    )

    pipeline.instruction = threadIxs;

    result.pipeline = pipeline as PipelineBase;

    return result as CreateThreadPipelineResult;
}
function shouldIncludeArchiveInThreadCreation(inbox: Inbox): boolean {
    if (inbox.len.eqn(0)) return false;
    // Keep this in sync with InboxClient.InboxSegmentSize.
    return inbox.len.gte(new BN(16 - 5));
}
