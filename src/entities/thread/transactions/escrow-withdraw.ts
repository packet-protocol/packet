import { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { HandleTxPipeline } from "../../../utils/pipeline";
import { CreateEscrowWithdrawPipeline } from "../pipeline/escrow-withdraw";
import type { Thread } from "../types";

export const EscrowWithdrawTx = async (
    connection: Connection,
    sender: PublicKey,
    program: PacketProgram,
    thread: Thread,
    receiverTokenAccount?: PublicKey,
    priorityFee: number = 1000,
) => {

    if (!thread.escrowPayment) {
        throw new Error("No escrow payment found for this thread");
    }

    if (thread.escrowPayment.released) {
        throw new Error("Escrow payment already released");
    }

    if (!thread.to.equals(sender)) {
        throw new Error("Only the receiver can withdraw from escrow");
    }

    let computeUnits = 250_000;

    // pipeline
    const { pipeline } = await CreateEscrowWithdrawPipeline(
        connection,
        sender,
        program,
        thread,
        receiverTokenAccount
    );

    // main tx
    const txs = await HandleTxPipeline(pipeline, {
        connection,
        payer: sender,
        computeUnits,
        priorityFee,
    });

    return txs;
}