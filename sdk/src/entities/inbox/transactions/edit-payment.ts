import { type Connection, type PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import type { InboxPaymentParams } from "../instructions/create";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";
import { HandleTxPipeline } from "../../..";
import { EditInboxPaymentPipeline } from "../pipeline/edit-payment";

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