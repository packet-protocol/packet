import { PublicKey } from "@solana/web3.js";
import {
    batchAddressTree,
    bn,
    PackedAccounts,
    selectStateTreeInfo,
    SystemAccountMetaConfig,
    type Rpc,
    type ValidityProof,
} from "@lightprotocol/stateless.js";

export type CreateAccountsProofTs = {
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

export type LightProofBase = {
    addressTree: PublicKey;
    outputStateTreeIndex: number;
    addressMerkleTreePubkeyIndex: number;
    addressQueuePubkeyIndex: number;
    packedAccounts: PackedAccounts;
};

export async function createLightProofBase(
    rpc: Rpc,
    programId: PublicKey,
    options: {
        cpiContext?: boolean;
    } = {},
): Promise<LightProofBase> {
    const stateTreeInfos = await rpc.getStateTreeInfos();
    const stateTreeInfo = selectStateTreeInfo(stateTreeInfos);

    const addressTree = new PublicKey(batchAddressTree);

    const packedAccounts = new PackedAccounts();

    const systemConfig = SystemAccountMetaConfig.new(programId);

    if (options.cpiContext) {
        const anyConfig = systemConfig as any;
        anyConfig.cpiContext = stateTreeInfo.cpiContext;
        anyConfig.cpiContextPubkey = stateTreeInfo.cpiContext;
        anyConfig.cpiContextAccount = stateTreeInfo.cpiContext;
    }

    packedAccounts.addSystemAccounts(systemConfig);

    const addressMerkleTreePubkeyIndex = packedAccounts.insertOrGet(addressTree);
    const addressQueuePubkeyIndex = addressMerkleTreePubkeyIndex;
    const outputStateTreeIndex = packedAccounts.insertOrGet(stateTreeInfo.queue);

    return {
        addressTree,
        outputStateTreeIndex,
        addressMerkleTreePubkeyIndex,
        addressQueuePubkeyIndex,
        packedAccounts,
    };
}

export async function makeCreateAccountsProof(args: {
    rpc: Rpc;
    base: LightProofBase;
    addresses: PublicKey[];
}): Promise<CreateAccountsProofTs> {
    const proofRpcResult = await args.rpc.getValidityProofV0(
        [],
        args.addresses.map((address) => ({
            tree: args.base.addressTree,
            queue: args.base.addressTree,
            address: bn(address.toBytes()),
        })),
    );

    if (proofRpcResult.rootIndices[0] === undefined) {
        throw new Error("Missing root index from Light validity proof response");
    }

    const metas = args.base.packedAccounts.toAccountMetas() as ReturnType<
        PackedAccounts["toAccountMetas"]
    > & {
        systemAccountsOffset?: number;
    };

    return {
        proof: {
            0: proofRpcResult.compressedProof,
        },
        addressTreeInfo: {
            rootIndex: proofRpcResult.rootIndices[0],
            addressMerkleTreePubkeyIndex: args.base.addressMerkleTreePubkeyIndex,
            addressQueuePubkeyIndex: args.base.addressQueuePubkeyIndex,
        },
        outputStateTreeIndex: args.base.outputStateTreeIndex,
        stateTreeIndex: null,
        systemAccountsOffset: metas.systemAccountsOffset ?? 0,
    };
}