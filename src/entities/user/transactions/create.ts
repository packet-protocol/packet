import {
    ComputeBudgetProgram,
    Connection,
    PublicKey,
    Transaction,
} from "@solana/web3.js";

import type { PacketProgram } from "../../../providers/program";
import { CreateUserIx } from "../instructions/create";
import type { CreateUserParams } from "../types";

export async function CreateUserTx(
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateUserParams,
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

    tx.add(await CreateUserIx(signer, program, params));

    tx.feePayer = signer;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    return tx;
}