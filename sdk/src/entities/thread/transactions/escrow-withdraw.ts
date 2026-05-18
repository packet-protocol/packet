import { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { HandleTxPipeline } from "../../../utils/pipeline";
import { CreateEscrowWithdrawPipeline } from "../pipeline/escrow-withdraw";
import type { Thread } from "../types";
import type { Rpc } from "@lightprotocol/stateless.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";

export const EscrowWithdrawTx = async (
    rpc: Rpc,
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: {
        thread: Thread,
        receiverTokenAccount?: PublicKey,
    },
    options?: PacketIxOptions & PacketTxOptions,
) => {
    const sender = options?.owner ?? signer;

    if (!params.thread.escrowPayment) {
        throw new Error("No escrow payment found for this thread");
    }

    if (params.thread.escrowPayment.released) {
        throw new Error("Escrow payment already released");
    }

    if (!params.thread.to.equals(sender)) {
        throw new Error("Only the receiver can withdraw from escrow");
    }

    let computeUnits = 250_000;

    // pipeline
    const { pipeline } = await CreateEscrowWithdrawPipeline(
        rpc,
        connection,
        signer,
        program,
        params,
        options,
    );

    // main tx
    const txs = await HandleTxPipeline(pipeline, {
        connection: connection,
        payer: sender,
        computeUnits,
        priorityFee: options?.priorityFee,
    });

    return txs;
}