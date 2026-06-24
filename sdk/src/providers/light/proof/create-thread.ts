import { PublicKey } from "@solana/web3.js";
import { type PackedAccounts, type Rpc } from "@lightprotocol/stateless.js";

import * as Pda from "../../../pda.js";
import {
    finalizeLightProof,
    getNewAddressProof,
    type FinalizedLightProof,
    type LightProofBundleWithMeta,
} from "./helpers.js";


export type CreateThreadAtomicProofResult = LightProofBundleWithMeta<{
    threadAddress: PublicKey;
    messageAddress: PublicKey;
}>;

export async function getCreateThreadAtomicProof(args: {
    rpc: Rpc;
    programId: PublicKey;
    threadId: number;
    messageSeq?: number;
}): Promise<FinalizedLightProof<CreateThreadAtomicProofResult>> {
    const messageSeq = args.messageSeq ?? 1;

    const threadAddress = Pda.threadPda(args.threadId, args.programId);
    const messageAddress = Pda.messagePda(args.threadId, messageSeq, args.programId);

    const proof = await getNewAddressProof({
        rpc: args.rpc,
        programId: args.programId,
        addresses: [
            threadAddress,
            messageAddress,
        ],
    });

    return finalizeLightProof({
        proof: proof.createAccountsProof,
        createAccountsProof: proof.createAccountsProof,
        packedAccounts: proof.packedAccounts,
        base: proof.base,

        threadAddress,
        messageAddress,
    });
}