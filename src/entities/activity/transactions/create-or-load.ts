import * as anchor from "@coral-xyz/anchor";
import { Rpc } from "@lightprotocol/stateless.js";
import {
    ComputeBudgetProgram,
    Connection,
    PublicKey,
} from "@solana/web3.js";

import type { PacketProgram } from "../../../providers/program";
import { LightPdaStatus } from "../../../providers/light/light-pda/status";
import {
    CreateOrLoadActivityIfNeededIx,
} from "../../activity/instructions/create-or-load";

export const CreateActivitiesIfNeededTx = async (
    connection: Connection,
    rpc: Rpc,
    sender: PublicKey,
    program: PacketProgram,
    owners: PublicKey[],
    priorityFee: number = 1000,
    recentBlockhash?: string
): Promise<anchor.web3.Transaction | null> => {
    const tx = new anchor.web3.Transaction();

    tx.add(
        ComputeBudgetProgram.setComputeUnitLimit({
            units: 400_000 + owners.length * 150_000,
        }),
    );

    if (priorityFee) {
        tx.add(
            ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: priorityFee,
            }),
        );
    }

    for (const owner of owners) {
        const result = await CreateOrLoadActivityIfNeededIx(
            connection,
            rpc,
            sender,
            owner,
            program,
        );

        if (result.status !== LightPdaStatus.Hot) {
            tx.add(result.instruction);
        }
    }

    if (tx.instructions.length <= (priorityFee ? 2 : 1)) {
        return null;
    }

    tx.feePayer = sender;
    tx.recentBlockhash = recentBlockhash ?? (
        await connection.getLatestBlockhash()
    ).blockhash;

    return tx;
};
