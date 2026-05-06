import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program";
import * as Pda from "../../../pda";
import { getCompressedPdaProof } from "../../../providers/light";
import { keyTypeToAnchor } from "../utils";
import type { CreateUserKeyParams } from "../types";

export async function CreateKeyIx(
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateUserKeyParams = {},
): Promise<TransactionInstruction> {
    const owner = params.owner ?? signer;
    const keyAddress = Pda.keyPda(owner, program.programId);

    const { proof, packedAccounts } = await getCompressedPdaProof({
        rpc,
        programId: program.programId,
        pda: keyAddress,
    });

    const metas = packedAccounts.toAccountMetas();

    const hasKey = params.key !== undefined;

    if (hasKey && !params.keyType) {
        throw new Error("keyType is required when key is provided");
    }

    return program.methods
        .createKey({
            proof: proof.proof,
            addressTreeInfo: proof.addressTreeInfo,
            outputStateTreeIndex: proof.outputStateTreeIndex,
            keyType: params.keyType ? keyTypeToAnchor(params.keyType) : null,
            key: params.key ? Buffer.from(params.key) : null,
        })
        .accounts({
            signer,
            owner,
            permit: null,
        })
        .remainingAccounts(metas.remainingAccounts)
        .instruction();
}