import * as anchor from "@coral-xyz/anchor";
import { ComputeBudgetProgram, type Connection, type PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { EditInboxPaymentIx } from "../instructions/edit-payment";
import type { InboxPaymentParams } from "../instructions/create";

export const EditInboxPaymentTx = async (
    connection: Connection,
    sender: PublicKey,
    program: PacketProgram,
    inboxPda: PublicKey,
    payment: InboxPaymentParams | null,
    priorityFee: number = 1000
) => {

    let computeUnits = 250_000;

    const ixs = await EditInboxPaymentIx(connection, sender, program, inboxPda, payment);
    const tx = new anchor.web3.Transaction();

    tx.add(
        ComputeBudgetProgram.setComputeUnitLimit({
            units: computeUnits,
        })
    )

    if (priorityFee) {
        tx.add(
            ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: priorityFee,
            })
        )
    }

    tx.add(...ixs);
    tx.feePayer = sender;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    return tx;
}