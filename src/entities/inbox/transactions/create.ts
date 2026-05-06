import * as anchor from "@coral-xyz/anchor";
import { ComputeBudgetProgram, type Connection, type PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { CreateInboxIx, type CreateInboxParams } from "../instructions/create";

export const CreateInboxTx = async (
    connection: Connection,
    sender: PublicKey,
    program: PacketProgram,
    params: CreateInboxParams,
    priorityFee: number = 1000
) => {

    let computeUnits = 300_000;

    const ixs = await CreateInboxIx(connection, sender, program, params);
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