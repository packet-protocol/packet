import { Rpc } from "@lightprotocol/stateless.js";
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { LightPdaStatus, type LightPdaNonHotStatus } from "../../../providers/light/light-pda/status";
import { CreateOrLoadActivityIfNeededIx } from "../../activity/instructions/create-or-load";
import { SendMsgIx } from "../instructions/send";
import { getThreadStatus } from "../../thread/account/helpers";
import { CreateLoadThreadCompressedIx } from "../../thread/instructions/load";
import type { CreateMessageInputAndAccountsParams } from "../instructions/resolve";
import type { PipelineBase, PipelineIxs } from "../../../types/client";

export type SendMsgPipelineResult = {
    fromActivity?: {
        status: LightPdaNonHotStatus;
    },
    toActivity?: {
        status: LightPdaNonHotStatus;
    },
    thread?: {
        status: LightPdaNonHotStatus;
    },
    pipeline: PipelineBase
}

export const SendMsgPipeline = async (
    connection: Connection,
    rpc: Rpc,
    sender: PublicKey,
    program: PacketProgram,
    params: CreateMessageInputAndAccountsParams,
) => {

    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<SendMsgPipelineResult> = {};

    if (!params.skipActivityCreation) {
        const fromActivity = await CreateOrLoadActivityIfNeededIx(connection, rpc, sender, params.threadInfo.from, program);
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

    if (!params.skipThreadLoad) {
        const threadStatus = await getThreadStatus({ connection, rpc, threadId: params.threadInfo.id, program });
        if (threadStatus.status !== LightPdaStatus.Hot) {
            result.thread = {
                status: threadStatus.status,
            }

            const ix = await CreateLoadThreadCompressedIx(rpc, sender, program, params.threadInfo.id);
            const threadLoadTx: PipelineIxs = { instructions: [ix], computeUnits: 300_000, isTxGroup: true };
            if (pipeline.preInstructions) {
                pipeline.preInstructions.push(threadLoadTx);
            } else {
                pipeline.preInstructions = [threadLoadTx];
            }
        }
    }


    // 3) Message
    const messageIxs = await SendMsgIx(
        connection,
        rpc,
        sender,
        program,
        params
    )

    pipeline.instruction = messageIxs;

    result.pipeline = pipeline as PipelineBase;

    return result as SendMsgPipelineResult;
}