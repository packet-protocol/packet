import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
    bn,
    PackedAccounts,
    SystemAccountMetaConfig,
    type Rpc,
} from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program";
import { keyTypeToAnchor } from "../utils";
import type { EditUserKeyParams } from "../types";
import { GetUserKeyAccount } from "../account/get";

export async function EditKeyIx(
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: EditUserKeyParams = {},
): Promise<TransactionInstruction> {
    const owner = params.owner ?? signer;

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

    const proofRpcResult = await rpc.getValidityProofV0(
        [
            {
                hash: compressedAccount.hash,
                tree: compressedAccount.treeInfo.tree,
                queue: compressedAccount.treeInfo.queue,
            },
        ],
        [],
    );

    const packedAccounts = new PackedAccounts();
    packedAccounts.addSystemAccounts(SystemAccountMetaConfig.new(program.programId));

    const merkleTreePubkeyIndex = packedAccounts.insertOrGet(
        compressedAccount.treeInfo.tree,
    );

    const queuePubkeyIndex = packedAccounts.insertOrGet(
        compressedAccount.treeInfo.queue,
    );

    /**
     * For a simple update, use the current account's output queue.
     * This keeps the account in the same state-tree family.
     */
    const outputStateTreeIndex = packedAccounts.insertOrGet(
        compressedAccount.treeInfo.queue,
    );

    const leafIndex =
        proofRpcResult.leafIndices?.[0] ?? compressedAccount.leafIndex;

    const accountMeta = {
        treeInfo: {
            merkleTreePubkeyIndex,
            queuePubkeyIndex,
            leafIndex,
            proveByIndex: compressedAccount.proveByIndex ?? true,
            rootIndex: proofRpcResult.rootIndices[0],
        },
        outputStateTreeIndex,
        address: compressedAccount.address,
    };

    const metas = packedAccounts.toAccountMetas();

    return program.methods
        .editKey({
            proof: {
                0: proofRpcResult.compressedProof,
            },
            accountMeta,

            currentKeyType: keyTypeToAnchor(current.data.keyType),
            currentKey: Buffer.from(current.data.key),

            newKeyType: params.keyType ? keyTypeToAnchor(params.keyType) : null,
            newKey: params.key ? Buffer.from(params.key) : null,
        })
        .accounts({
            signer,
            owner,
            permit: null,
        })
        .remainingAccounts(metas.remainingAccounts)
        .instruction();
}