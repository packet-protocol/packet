import { type Connection, type PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import type { InboxPaymentParams } from "../instructions/create.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { HandleTxPipeline } from "../../../index.js";
import { EditInboxPaymentPipeline } from "../pipeline/edit-payment.js";

export const EditInboxPaymentTx = async (
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    inboxPda: PublicKey,
    payment: InboxPaymentParams | null,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let computeUnits = 250_000;

    // pipeline
    const { pipeline } = await EditInboxPaymentPipeline(
        connection,
        signer,
        program,
        inboxPda,
        payment,
        options
    );

    // main tx
    const txs = await HandleTxPipeline(pipeline, {
        connection,
        payer: signer,
        computeUnits,
        priorityFee: options?.priorityFee,
        lookupTables: options?.lookupTables
    });

    return txs;
}