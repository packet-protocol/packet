import * as anchor from "@coral-xyz/anchor";
import { Rpc } from "@lightprotocol/stateless.js";
import { ComputeBudgetProgram, Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { CreateActivityIx } from "../instructions";

export const CreateActivityTx = async (
    connection: Connection,
    rpc: Rpc,
    sender: PublicKey,
    program: PacketProgram,
    params: {
        owner: PublicKey;
    },
    priorityFee: number = 1000
) => {
    let computeUnits = 200_000;

    const ix = await CreateActivityIx(
        rpc,
        sender,
        params.owner,
        program,
    );

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

    tx.add(ix);
    tx.feePayer = sender;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    return tx;
}