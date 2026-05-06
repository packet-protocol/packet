import { Rpc } from "@lightprotocol/stateless.js";
import { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { HandleTxPipeline } from "../../../utils/pipeline";
import { EscrowApprovePipeline } from "../pipeline/escrow-approve";
import type { Thread } from "../types";

export const EscrowApproveTx = async (
    connection: Connection,
    rpc: Rpc,
    sender: PublicKey,
    program: PacketProgram,
    thread: Thread,
    params: { skipActivityCreation?: boolean } = {},
    priorityFee: number = 1000,
) => {

    // pipeline
    const { pipeline } = await EscrowApprovePipeline(
        connection,
        rpc,
        sender,
        program,
        thread,
        params
    );

    // main tx
    const txs = await HandleTxPipeline(pipeline, {
        connection,
        payer: sender,
        priorityFee,
    });

    return txs;
}