import {
    ComputeBudgetProgram,
    Connection,
    PublicKey,
    Transaction,
} from "@solana/web3.js";

import type { PacketProgram } from "../../../providers/program";
import { EditUserIx } from "../instructions/edit";
import type { EditUserParams } from "../types";

export async function EditUserTx(
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: EditUserParams,
    priorityFee = 1000,
): Promise<Transaction> {
    const tx = new Transaction();

    tx.add(
        ComputeBudgetProgram.setComputeUnitLimit({
            units: 200_000,
        }),
    );

    if (priorityFee) {
        tx.add(
            ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: priorityFee,
            }),
        );
    }

    tx.add(await EditUserIx(signer, program, params));

    tx.feePayer = signer;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    return tx;
}