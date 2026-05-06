import {
    ComputeBudgetProgram,
    Connection,
    PublicKey,
    Transaction,
} from "@solana/web3.js";
import type { Rpc } from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program";
import { EditKeyIx } from "../instructions/edit";
import type { EditUserKeyParams } from "../types";

export async function EditKeyTx(
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: EditUserKeyParams = {},
    priorityFee = 1000,
): Promise<Transaction> {
    const tx = new Transaction();

    tx.add(
        ComputeBudgetProgram.setComputeUnitLimit({
            units: 500_000,
        }),
    );

    if (priorityFee) {
        tx.add(
            ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: priorityFee,
            }),
        );
    }

    tx.add(await EditKeyIx(rpc, signer, program, params));

    tx.feePayer = signer;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    return tx;
}