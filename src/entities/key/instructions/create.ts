import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program";
import * as Pda from "../../../pda";
import { keyTypeToAnchor } from "../utils";
import type { CreateUserKeyParams } from "../types";
import { getCompressedPdaProofFinalized } from "../../../providers/light/proof/helpers";
import type { PacketIxOptions } from "../../transaction/types";

export async function CreateKeyIx(
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateUserKeyParams = {},
    options?: PacketIxOptions 
): Promise<TransactionInstruction> {

    const owner = options?.owner ?? signer;

    const keyAddress = Pda.keyPda(owner, program.programId);

    const hasKey = params.key !== undefined;

    if (hasKey && !params.keyType) {
        throw new Error("keyType is required when key is provided");
    }

    const { proof, metas } = await getCompressedPdaProofFinalized({
        rpc,
        programId: program.programId,
        pda: keyAddress,
    });

    return program.methods
        .createKey({
            createAccountsProof: proof,
            keyType: params.keyType ? keyTypeToAnchor(params.keyType) : null,
            key: params.key ? Buffer.from(params.key) : null,
        })
        .accounts({
            signer,
            owner,
            permit: options?.permit ?? null,
        })
        .remainingAccounts(metas.remainingAccounts)
        .instruction();
}