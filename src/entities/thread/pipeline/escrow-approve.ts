import { Rpc } from "@lightprotocol/stateless.js";
import { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { LightPdaStatus, type LightPdaNonHotStatus } from "../../../providers/light/light-pda/status";
import { CreateOrLoadActivityIfNeededIx } from "../../activity/instructions/create-or-load";
import type { PipelineBase, PipelineIxs } from "../../../types/client";
import type { Thread } from "../types";
import { EscrowApproveIx } from "../instructions/escrow-approve";

export type EscrowApprovePipelineResult = {
    fromActivity?: {
        status: LightPdaNonHotStatus;
    },
    toActivity?: {
        status: LightPdaNonHotStatus;
    },
    pipeline: PipelineBase
}

export const EscrowApprovePipeline = async (
    connection: Connection,
    rpc: Rpc,
    sender: PublicKey,
    program: PacketProgram,
    thread: Thread,
    params: { skipActivityCreation?: boolean } = {}
) => {
    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<EscrowApprovePipelineResult> = {};

    if (!params.skipActivityCreation) {
        const fromActivity = await CreateOrLoadActivityIfNeededIx(connection, rpc, sender, thread.from, program);
        const toActivity = await CreateOrLoadActivityIfNeededIx(connection, rpc, sender, thread.to, program);

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
             if (thread.from.equals(thread.to)) {
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

    // 2) approve
    const ix = await EscrowApproveIx(
        sender,
        program,
        thread
    );

    pipeline.instruction = ix;

    result.pipeline = pipeline as PipelineBase;

    return result as EscrowApprovePipelineResult;
}