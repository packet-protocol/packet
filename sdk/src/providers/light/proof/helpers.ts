import { PublicKey, type AccountMeta } from "@solana/web3.js";
import {
    bn,
    getBatchAddressTreeInfo,
    PackedAccounts,
    selectStateTreeInfo,
    SystemAccountMetaConfig,
    TreeType,
    type CompressedAccount,
    type Rpc,
    type ValidityProof,
} from "@lightprotocol/stateless.js";

import type { CompressedAccountMetaPacket } from "./types";

export type CreateAccountsProofTs = {
    proof: { 0: ValidityProof | null };
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
    addressQueue: PublicKey;
    outputStateTree: PublicKey;

    outputStateTreeIndex: number;
    addressMerkleTreePubkeyIndex: number;
    addressQueuePubkeyIndex: number;

    packedAccounts: PackedAccounts;
};

export type LightProofBundle = {
    createAccountsProof: CreateAccountsProofTs;
    packedAccounts: PackedAccounts;
    base: LightProofBase;
};

export type LightProofBundleWithMeta<T> = T & {
    metas: ReturnType<PackedAccounts["toAccountMetas"]> & {
        systemAccountsOffset?: number;
    };
} & LightProofBundle;

export async function createLightProofBase(
    rpc: Rpc,
    programId: PublicKey,
    options?: {
        outputStateTree?: PublicKey;
    },
): Promise<LightProofBase> {
    const stateTreeInfo = selectStateTreeInfo(await rpc.getStateTreeInfos());
    const addressTreeInfo = getBatchAddressTreeInfo();

    const packedAccounts = new PackedAccounts();

    const config = SystemAccountMetaConfig.new(programId);
    packedAccounts.addSystemAccounts(config);

    const addressMerkleTreePubkeyIndex = packedAccounts.insertOrGet(
        addressTreeInfo.tree,
    );

    // Batch address V2 uses the same account for tree and queue; keep one packed index.
    const addressQueuePubkeyIndex = packedAccounts.insertOrGet(
        addressTreeInfo.tree,
    );

    // V2 writes updated account hashes to an output queue. For update flows,
    // callers should pass the existing account queue to avoid cross-tree proofs.
    const outputStateTree = options?.outputStateTree ?? stateTreeInfo.queue;

    const outputStateTreeIndex = packedAccounts.insertOrGet(
        outputStateTree,
    );

    return {
        addressTree: addressTreeInfo.tree,
        addressQueue: addressTreeInfo.queue,
        outputStateTree,

        outputStateTreeIndex,
        addressMerkleTreePubkeyIndex,
        addressQueuePubkeyIndex,

        packedAccounts,
    };
}

export function makeCreateAccountsProofFromValidity(args: {
    base: LightProofBase;
    compressedProof: ValidityProof | null;
    addressRootIndex: number;
}): CreateAccountsProofTs {
    return {
        proof: { 0: args.compressedProof },
        addressTreeInfo: {
            rootIndex: args.addressRootIndex,
            addressMerkleTreePubkeyIndex: args.base.addressMerkleTreePubkeyIndex,
            addressQueuePubkeyIndex: args.base.addressQueuePubkeyIndex,
        },
        outputStateTreeIndex: args.base.outputStateTreeIndex,
        stateTreeIndex: null,
        systemAccountsOffset: 0,
    };
}

export function findRemainingIndex(
    accounts: AccountMeta[],
    pubkey: PublicKey,
    label: string,
): number {
    const index = accounts.findIndex((account) =>
        account.pubkey.equals(pubkey),
    );

    if (index < 0) {
        throw new Error(`${label} not found in remaining accounts: ${pubkey.toBase58()}`);
    }

    if (index > 255) {
        throw new Error(`${label} index exceeds u8: ${index}`);
    }

    return index;
}

export type LightAccountMetas = ReturnType<PackedAccounts["toAccountMetas"]> & {
    systemStart: number;
    packedStart: number;
};

export type FinalizedLightProof<T extends LightProofBundle> = T & {
    metas: LightAccountMetas;
} & LightProofBundle;

export function finalizeLightProof<T extends LightProofBundle>(
    bundle: T,
): FinalizedLightProof<T> {
    const metas = bundle.packedAccounts.toAccountMetas() as ReturnType<
        PackedAccounts["toAccountMetas"]
    > & {
        systemStart: number;
        packedStart: number;
    };

    /**
     * IMPORTANT:
     * The indexes inside CreateAccountsProof are PACKED indexes.
     * Do not convert them to raw remainingAccounts indexes.
     *
     * Rust passes remaining_accounts[systemStart..] into CpiAccounts::new(...).
     * CpiAccounts then resolves packed indexes internally.
     */
    bundle.createAccountsProof.systemAccountsOffset = metas.systemStart ?? 0;

    bundle.createAccountsProof.addressTreeInfo.addressMerkleTreePubkeyIndex =
        bundle.base.addressMerkleTreePubkeyIndex;

    bundle.createAccountsProof.addressTreeInfo.addressQueuePubkeyIndex =
        bundle.base.addressQueuePubkeyIndex;

    bundle.createAccountsProof.outputStateTreeIndex =
        bundle.base.outputStateTreeIndex;

    return {
        ...bundle,
        metas,
    };
}



export async function getNewAddressProof(args: {
    rpc: Rpc;
    programId: PublicKey;
    addresses: PublicKey[];
    base?: LightProofBase;
}): Promise<LightProofBundle> {
    const base = args.base ?? await createLightProofBase(args.rpc, args.programId);

    const proof = await args.rpc.getValidityProofV0(
        [],
        args.addresses.map((address) => ({
            tree: base.addressTree,
            queue: base.addressQueue,
            address: bn(address.toBytes()),
        })),
    );

    if (!proof.compressedProof) {
        throw new Error("Missing compressed proof for new address proof");
    }

    if (proof.rootIndices[0] === undefined) {
        throw new Error("Missing address root index for new address proof");
    }

    return {
        createAccountsProof: makeCreateAccountsProofFromValidity({
            base,
            compressedProof: proof.compressedProof,
            addressRootIndex: proof.rootIndices[0],
        }),
        packedAccounts: base.packedAccounts,
        base,
    };
}

export async function getExistingAccountProof(args: {
    rpc: Rpc;
    programId: PublicKey;
    account: CompressedAccount;
    newAddresses?: PublicKey[];
    base?: LightProofBase;
}): Promise<LightProofBundle & {
    accountRootIndex: number;
}> {
    const base = args.base ?? await createLightProofBase(args.rpc, args.programId, {
        outputStateTree: args.account.treeInfo.queue,
    });
    const newAddresses = args.newAddresses ?? [];
    const proveByIndex = args.account.treeInfo.treeType === TreeType.StateV2;

    if (proveByIndex && newAddresses.length === 0) {
        return {
            createAccountsProof: makeCreateAccountsProofFromValidity({
                base,
                compressedProof: null,
                addressRootIndex: 0,
            }),
            packedAccounts: base.packedAccounts,
            base,
            accountRootIndex: 0,
        };
    }

    const proof = await args.rpc.getValidityProofV0(
        proveByIndex
            ? []
            : [
                {
                    hash: args.account.hash,
                    tree: args.account.treeInfo.tree,
                    queue: args.account.treeInfo.queue,
                },
            ],
        newAddresses.map((address) => ({
            tree: base.addressTree,
            queue: base.addressQueue,
            address: bn(address.toBytes()),
        })),
    );

    if (!proveByIndex && proof.rootIndices[0] === undefined) {
        throw new Error("Missing account root index for existing account proof");
    }

    /**
     * Pure mutation path can return no compressedProof.
     * Existing-only update is still valid with proof null.
     *
     * But if we also prove new address non-inclusion, then missing proof is suspicious.
     */
    if (newAddresses.length > 0 && !proof.compressedProof) {
        throw new Error("Missing compressed proof for existing account + new address proof");
    }

    const addressRootIndex =
        newAddresses.length > 0 && proveByIndex
            ? proof.rootIndices[0]
            : newAddresses.length > 0
            ? proof.rootIndices[1]
            : proof.rootIndices[0];

    if (newAddresses.length > 0 && addressRootIndex === undefined) {
        throw new Error("Missing address root index for existing account proof");
    }

    return {
        createAccountsProof: makeCreateAccountsProofFromValidity({
            base,
            compressedProof: proof.compressedProof ?? null,
            addressRootIndex: addressRootIndex ?? 0,
        }),
        packedAccounts: base.packedAccounts,
        base,
        accountRootIndex: proveByIndex ? 0 : proof.rootIndices[0],
    };
}

export function buildCompressedAccountMetaPacket(args: {
    base: LightProofBase;
    account: any;
    rootIndex: number;
}): CompressedAccountMetaPacket {
    const merkleTreePubkeyIndex = args.base.packedAccounts.insertOrGet(
        args.account.treeInfo.tree,
    );

    const queuePubkeyIndex = args.base.packedAccounts.insertOrGet(
        args.account.treeInfo.queue,
    );

    return {
        treeInfo: {
            rootIndex: args.rootIndex,
            proveByIndex: args.account.treeInfo.treeType === TreeType.StateV2,
            merkleTreePubkeyIndex,
            queuePubkeyIndex,
            leafIndex: args.account.leafIndex,
        },
        outputStateTreeIndex: args.base.outputStateTreeIndex,
    } as CompressedAccountMetaPacket;
}

export async function getCompressedPdaProofFinalized(args: {
    rpc: Rpc;
    programId: PublicKey;
    pda: PublicKey;
}) {
    const proof = await getNewAddressProof({
        rpc: args.rpc,
        programId: args.programId,
        addresses: [args.pda],
    });

    return finalizeLightProof({
        proof: proof.createAccountsProof,
        createAccountsProof: proof.createAccountsProof,
        packedAccounts: proof.packedAccounts,
        base: proof.base,
    });

}

export async function getCompressedPdaProofExistingFinalized(args: {
    rpc: Rpc;
    programId: PublicKey;
    compressedAccount: CompressedAccount;
}) {
    const proof = await getExistingAccountProof({
        rpc: args.rpc,
        programId: args.programId,
        account: args.compressedAccount,
        newAddresses: [],
    });

    const accountMetaPacket = buildCompressedAccountMetaPacket({
        base: proof.base,
        account: args.compressedAccount,
        rootIndex: proof.accountRootIndex,
    });


    return finalizeLightProof({
        proof: proof.createAccountsProof,
        createAccountsProof: proof.createAccountsProof,
        packedAccounts: proof.packedAccounts,
        base: proof.base,

        accountMetaPacket,
        accountMeta: {
            ...accountMetaPacket,
            address: args.compressedAccount.address
        },
    });

}
