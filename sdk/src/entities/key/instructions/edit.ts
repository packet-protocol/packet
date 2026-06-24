import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program.js";
import { keyTypeToAnchor } from "../utils.js";
import type { EditUserKeyParams } from "../types.js";
import { GetUserKeyAccount } from "../account/get.js";
import { getCompressedPdaProofExistingFinalized } from "../../../providers/light/proof/helpers.js";
import type { PacketIxOptions } from "../../transaction/types.js";

export async function EditKeyIx(
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: EditUserKeyParams = {},
    options?: PacketIxOptions 
): Promise<TransactionInstruction> {
    const owner = options?.owner ?? signer;

    if (params.key && !params.keyType) {
        throw new Error("keyType is required when key is provided");
    }

    if (!params.key && params.keyType) {
        throw new Error("Changing keyType without key is invalid");
    }

    const current = await GetUserKeyAccount({
        rpc,
        program,
        owner,
    });

    if (!current) {
        throw new Error("User key does not exist");
    }

    const compressedAccount = current.compressedAccount;
    const { proof, metas, accountMetaPacket } = await getCompressedPdaProofExistingFinalized({
        rpc,
        programId: program.programId,
        compressedAccount,
    });

    return program.methods
        .editKey({
            createAccountsProof: proof,
            accountMeta: accountMetaPacket,

            currentKeyType: keyTypeToAnchor(current.data.keyType),
            currentKey: Buffer.from(current.data.key),

            newKeyType: params.keyType ? keyTypeToAnchor(params.keyType) : null,
            newKey: params.key ? Buffer.from(params.key) : null,
        })
        .accounts({
            signer,
            owner,
            permit: options?.permit ?? null,
        })
        .remainingAccounts(metas.remainingAccounts)
        .instruction();
}