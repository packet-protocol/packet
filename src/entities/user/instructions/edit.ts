import {
    PublicKey,
    TransactionInstruction,
} from "@solana/web3.js";

import type { PacketProgram } from "../../../providers/program";
import type { EditUserParams } from "../types";
import { assertUserStringLimits } from "../utils";
import type { PacketIxOptions } from "../../transaction/types";

export async function EditUserIx(
    signer: PublicKey,
    program: PacketProgram,
    params: EditUserParams,
    options?: PacketIxOptions
): Promise<TransactionInstruction> {
     const owner = options?.owner ?? signer;

    assertUserStringLimits({
        name: params.name,
        uri: params.uri,
    });

    return program.methods
        .editUser({
            name: params.name,
            uri: params.uri,
        })
        .accounts({
            signer,
            owner,
            permit: options?.permit ?? null,
            agentIdentity: params.agentIdentity ?? null,
        })
        .instruction();
}