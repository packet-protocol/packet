import { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import { type InboxPaymentParams } from "../instructions/create.js";
import type { PipelineBase } from "../../../types/client.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { EditInboxPaymentIx } from "../instructions/edit-payment.js";

export type EditInboxPaymentPipelineResult = {
    pipeline: PipelineBase
}

export const EditInboxPaymentPipeline = async (
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    inboxPda: PublicKey,
    payment: InboxPaymentParams | null,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<EditInboxPaymentPipelineResult> = {};

    const ixs = await EditInboxPaymentIx(
        connection,
        signer,
        program,
        inboxPda,
        payment,
        options
    );

    pipeline.instruction = ixs;

    result.pipeline = pipeline as PipelineBase;

    return result as EditInboxPaymentPipelineResult;
}