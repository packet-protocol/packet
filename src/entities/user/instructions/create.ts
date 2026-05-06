import {
    PublicKey,
    TransactionInstruction,
} from "@solana/web3.js";

import type { PacketProgram } from "../../../providers/program";
import type { CreateUserParams } from "../types";
import { assertUserStringLimits } from "../utils";

export async function CreateUserIx(
    signer: PublicKey,
    program: PacketProgram,
    params: CreateUserParams,
): Promise<TransactionInstruction> {
    const owner = params.owner ?? signer;

    assertUserStringLimits({
        name: params.name,
        uri: params.uri,
    });

    return program.methods
        .createUser({
            name: params.name,
            uri: params.uri,
        })
        .accounts({
            signer,
            owner,
            permit: null,
            agentIdentity: params.agentIdentity ?? null,
        })
        .instruction();
}