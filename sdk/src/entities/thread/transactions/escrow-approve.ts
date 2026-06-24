import { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import { HandleTxPipeline } from "../../../utils/pipeline.js";
import { EscrowApprovePipeline } from "../pipeline/escrow-approve.js";
import type { Thread } from "../types.js";
import type { Rpc } from "@lightprotocol/stateless.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";

export const EscrowApproveTx = async (
    rpc: Rpc,
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    thread: Thread,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    // pipeline
    const { pipeline } = await EscrowApprovePipeline(
        rpc,
        signer,
        program,
        thread,
        options,
    );

    // main tx
    const txs = await HandleTxPipeline(pipeline, {
        connection,
        payer: signer,
        priorityFee: options?.priorityFee,
    });

    return txs;
}