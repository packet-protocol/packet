import * as anchor from "@coral-xyz/anchor";
import {
    type AccountMeta,
    PublicKey,
} from "@solana/web3.js";
import {
    batchAddressTree,
    bn,
    deriveAddressV2,
    LIGHT_TOKEN_PROGRAM_ID,
    PackedAccounts,
    SystemAccountMetaConfig,
    type Rpc,
} from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program";
import * as Pda from "../../../pda";
import packetIdl from "../../../idl/packet.idl.json";
import { LIGHT_TOKEN_CONFIG, LIGHT_TOKEN_RENT_SPONSOR } from "@lightprotocol/compressed-token";
import { LIGHT_TOKEN_CPI_AUTHORITY } from "../../../providers/light/light-pda/constants";


export async function deriveCompressedPdaAddress(params: {
    address: PublicKey;
    programId: PublicKey;
}): Promise<PublicKey> {

    const addressTree = new PublicKey(batchAddressTree);

    return deriveAddressV2(
        params.address.toBytes(),
        addressTree,
        params.programId,
    );
}

export async function createLoadCompressedPdaIx(
    rpc: Rpc,
    feePayer: PublicKey,
    program: PacketProgram,
    pda: PublicKey,
    packedName: string,
    name: string,
    variantSeedsDerive: (packedAccounts: PackedAccounts) => {seeds: Record<string, any>, packedAccounts: PackedAccounts},
) {

    const compressedAddress = await deriveCompressedPdaAddress({
        address: pda,
        programId: program.programId,
    });

    const compressedAccount = await rpc.getCompressedAccount(
        bn(compressedAddress.toBytes()),
    );

    if (!compressedAccount) {
        throw new Error(`${name} compressed account does not exist`);
    }

    /**
     * Existing-account proof.
     *
     * matches Light's update example:
     * getValidityProofV0([{ hash, tree, queue }], [])
     */
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

    var remaining = new PackedAccounts();

    /**
    * Adds Light system accounts.
    * These indices start at 0 inside PackedAccounts.
    */
    remaining.addSystemAccounts(
        SystemAccountMetaConfig.new(program.programId),
    );

    const outputQueue = getOutputQueue(compressedAccount.treeInfo);
    const outputQueueIndex = remaining.insertOrGet(outputQueue);

    const merkleTreePubkeyIndex = remaining.insertOrGet(
        compressedAccount.treeInfo.tree,
    );

    const queuePubkeyIndex = remaining.insertOrGet(
        compressedAccount.treeInfo.queue,
    );

    console.log(`${name} compressed account:`, {
        data: compressedAccount.data,
    });

    /**
        * Decode the cold account's compressed data .
        */
    const coder = new anchor.BorshCoder(packetIdl as anchor.Idl);

    const packedAccount = coder.types.decode(
        packedName,
       compressedAccount.data.data
    );

    const proof = {
        0: proofRpcResult.compressedProof,
    };

    const variantSeedsDeriveRes = variantSeedsDerive(packedAccount);

    remaining = variantSeedsDeriveRes.packedAccounts;

    const variant = {
        [name]: {
            seeds: {
                ...variantSeedsDeriveRes.seeds,
            },
            data: packedAccount,
        },
    };

    const paramsArg = {
        systemAccountsOffset: LOAD_PDA_ONLY_PROGRAM_METAS.length,

        tokenAccountsOffset: 1,
        outputQueueIndex,
        proof,

        accounts: [
            {
                treeInfo: {
                    rootIndex: proofRpcResult.rootIndices[0],
                    proveByIndex: true,
                    merkleTreePubkeyIndex,
                    queuePubkeyIndex,
                    leafIndex: compressedAccount.leafIndex,
                },
                data: variant,
            },
        ],
    };

    const packedMetas = remaining.toAccountMetas();

    const hotMeta: AccountMeta = {
        pubkey: pda,
        isSigner: false,
        isWritable: true,
    };

    const ix = await program.methods
        .decompressAccountsIdempotent(paramsArg)
        .remainingAccounts([
            ...loadPdaOnlyProgramMetas({
                feePayer,
                compressionConfig: Pda.compressionConfigPda,
                rentSponsor: Pda.rentSponsorPda,
            }),
            ...packedMetas.remainingAccounts,
            hotMeta,
        ])
        .instruction();

    return ix;
}


/**
 * Matches light_client::interface::instructions::load::accounts_pda_only.
 *
 * Rust order:
 * 0 fee_payer writable signer
 * 1 config readonly
 * 2 rent_sponsor writable
 * 3 rent_sponsor writable placeholder for ctoken_rent_sponsor
 * 4 LIGHT_TOKEN_PROGRAM_ID readonly
 * 5 LIGHT_TOKEN_CPI_AUTHORITY readonly
 * 6 LIGHT_TOKEN_CONFIG readonly
 */
const LOAD_PDA_ONLY_PROGRAM_METAS_LENGTH = 7;

const LOAD_PDA_ONLY_PROGRAM_METAS = new Array(
    LOAD_PDA_ONLY_PROGRAM_METAS_LENGTH,
);

function loadPdaOnlyProgramMetas(params: {
    feePayer: PublicKey;
    compressionConfig: PublicKey;
    rentSponsor: PublicKey;
}): AccountMeta[] {
    return [
        {
            pubkey: params.feePayer,
            isSigner: true,
            isWritable: true,
        },
        {
            pubkey: params.compressionConfig,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: params.rentSponsor,
            isSigner: false,
            isWritable: true,
        },

        // PDA-only placeholder for ctoken rent sponsor.
        {
            pubkey: LIGHT_TOKEN_RENT_SPONSOR,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: LIGHT_TOKEN_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: LIGHT_TOKEN_CPI_AUTHORITY,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: LIGHT_TOKEN_CONFIG,
            isSigner: false,
            isWritable: false,
        },
    ];
}

function getOutputQueue(treeInfo: any): PublicKey {
    /**
     * tree_info.next_tree_info.as_ref().map(|next| next.queue).unwrap_or(tree_info.queue)
     */
    const q = treeInfo.nextTreeInfo?.queue ?? treeInfo.next_tree_info?.queue ?? treeInfo.queue;

    return q instanceof PublicKey ? q : new PublicKey(q);
}