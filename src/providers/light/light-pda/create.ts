import { PublicKey } from "@solana/web3.js";
import {
    batchAddressTree,
    bn,
    deriveAddressV2,
    PackedAccounts,
    selectStateTreeInfo,
    SystemAccountMetaConfig,
    type Rpc,
    type ValidityProof,
} from "@lightprotocol/stateless.js";

export type CreateAccountsProofResult = {
    createAccountsProof: {
        proof: { 0: ValidityProof };
        addressTreeInfo: {
            rootIndex: number;
            addressMerkleTreePubkeyIndex: number;
            addressQueuePubkeyIndex: number;
        };
        outputStateTreeIndex: number;
        stateTreeIndex: number | null;
        systemAccountsOffset: number;
    };
    packedAccounts: PackedAccounts;
};

export async function getCreateAccountsProofForPda(
    rpc: Rpc,
    programId: PublicKey,
    pda: PublicKey,
    packedAccounts?: PackedAccounts,
): Promise<CreateAccountsProofResult> {
    const stateTreeInfos = await rpc.getStateTreeInfos();
    const stateTreeInfo = selectStateTreeInfo(stateTreeInfos);

    const addressTree = new PublicKey(batchAddressTree);

    const compressedAddress = deriveAddressV2(
        pda.toBytes(),
        addressTree,
        programId,
    );

    const proofRpcResult = await rpc.getValidityProofV0(
        [],
        [
            {
                tree: addressTree,
                queue: addressTree,
                address: bn(compressedAddress.toBytes()),
            },
        ],
    );

    const remaining = packedAccounts ?? new PackedAccounts();

    // Only add system accounts when this helper owns the packer.
    // When sharing, the caller should add them once.
    if (!packedAccounts) {
        remaining.addSystemAccounts(SystemAccountMetaConfig.new(programId));
    }

    const addressMerkleTreePubkeyIndex = remaining.insertOrGet(addressTree);
    const addressQueuePubkeyIndex = addressMerkleTreePubkeyIndex;

    const outputStateTreeIndex = remaining.insertOrGet(stateTreeInfo.queue);

    const metas = remaining.toAccountMetas() as ReturnType<
        PackedAccounts["toAccountMetas"]
    > & {
        systemAccountsOffset?: number;
    };

    return {
        createAccountsProof: {
            proof: {
                0: proofRpcResult.compressedProof,
            },
            addressTreeInfo: {
                rootIndex: proofRpcResult.rootIndices[0],
                addressMerkleTreePubkeyIndex,
                addressQueuePubkeyIndex,
            },
            outputStateTreeIndex,
            stateTreeIndex: null,
            systemAccountsOffset: metas.systemAccountsOffset ?? 0
        },
        packedAccounts: remaining,
    };
}