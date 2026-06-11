import { PublicKey } from "@solana/web3.js";
import { type PackedAccounts, type Rpc } from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../program";
import * as Pda from "../../../pda";
import { GetThreadAccount } from "../../../entities/thread/account/get";
import {
    buildCompressedAccountMetaPacket,
    finalizeLightProof,
    getExistingAccountProof,
    type CreateAccountsProofTs,
    type FinalizedLightProof,
    type LightProofBase,
    type LightProofBundleWithMeta,
} from "./helpers";
import type {
    CompressedAccountMeta,
    CompressedAccountMetaPacket,
} from "./types";
import type { ThreadAccountData } from "../../../entities/thread/types";

export type ExistingThreadProofResult = {
    threadAddress: PublicKey;
    currentThread: ThreadAccountData;
    threadAccountMetaPacket: CompressedAccountMetaPacket;
    threadAccountMeta: CompressedAccountMeta;
    createAccountsProof: CreateAccountsProofTs;
    packedAccounts: PackedAccounts;
    base: LightProofBase;
};

export async function getExistingThreadProof(args: {
    rpc: Rpc;
    program: PacketProgram;
    threadId: number;
    newAddresses?: PublicKey[];
}): Promise<ExistingThreadProofResult> {
    const threadAddress = Pda.threadPda(args.threadId, args.program.programId);

    const threadAccount = await GetThreadAccount(
        args.rpc,
        args.program,
        threadAddress,
    );

    if (!threadAccount) {
        throw new Error(`Thread compressed account does not exist: ${args.threadId}`);
    }

    const proof = await getExistingAccountProof({
        rpc: args.rpc,
        programId: args.program.programId,
        account: threadAccount.compressedAccount,
        newAddresses: args.newAddresses,
    });

    const threadAccountMetaPacket = buildCompressedAccountMetaPacket({
        base: proof.base,
        account: threadAccount.compressedAccount,
        rootIndex: proof.accountRootIndex,
        proveByIndex: proof.accountProveByIndex,
    });

    return {
        threadAddress,
        currentThread: threadAccount.data,
        threadAccountMetaPacket,
        threadAccountMeta: {
            ...threadAccountMetaPacket,
            address: Array.from(threadAddress.toBytes()),
        },
        createAccountsProof: proof.createAccountsProof,
        packedAccounts: proof.packedAccounts,
        base: proof.base,
    };
}

export type ThreadMutationProofResult = LightProofBundleWithMeta<{
    threadAccountMetaPacket: CompressedAccountMetaPacket;
    currentThread: ThreadAccountData;

    threadAddress: PublicKey;
}>;


export const getThreadMutationProof = async (args: {
    rpc: Rpc;
    program: PacketProgram;
    threadId: number;
}): Promise<FinalizedLightProof<ThreadMutationProofResult>> => {
    const proof = await getExistingThreadProof({
        rpc: args.rpc,
        program: args.program,
        threadId: args.threadId,
        newAddresses: [],
    });

    return finalizeLightProof({
        proof: proof.createAccountsProof,
        createAccountsProof: proof.createAccountsProof,
        packedAccounts: proof.packedAccounts,
        base: proof.base,

        threadAccountMetaPacket: proof.threadAccountMetaPacket,
        currentThread: proof.currentThread,
        
        threadAddress: proof.threadAddress,
    });
}