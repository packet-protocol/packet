import { PublicKey } from "@solana/web3.js";
import { type PackedAccounts, type Rpc } from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../program.js";
import * as Pda from "../../../pda.js";
import { getExistingThreadProof } from "./thread.js";
import {
    finalizeLightProof,
    type FinalizedLightProof,
    type LightProofBundleWithMeta,
} from "./helpers.js";
import type { CompressedAccountMetaPacket } from "./types.js";
import type { ThreadAccountData } from "../../../entities/thread/types.js";

export type SendMessageProofResult = LightProofBundleWithMeta<{
    threadAccountMeta: CompressedAccountMetaPacket;
    currentThread: ThreadAccountData;

    threadAddress: PublicKey;
    messageAddress: PublicKey;
    messageSeq: number;
}>;

export async function getSendMessageProof(args: {
    rpc: Rpc;
    program: PacketProgram;
    threadId: number;
    messageSeq: number;
}): Promise<FinalizedLightProof<SendMessageProofResult>> {
    const expectedThreadAddress = Pda.threadPda(args.threadId, args.program.programId);
    const messageAddress = Pda.messagePda(args.threadId, args.messageSeq, args.program.programId);

    const proof = await getExistingThreadProof({
        rpc: args.rpc,
        program: args.program,
        threadId: args.threadId,
        newAddresses: [messageAddress],
    });

    return finalizeLightProof({
        proof: proof.createAccountsProof,
        createAccountsProof: proof.createAccountsProof,
        packedAccounts: proof.packedAccounts,
        base: proof.base,

        currentThread: proof.currentThread,
        threadAccountMeta: proof.threadAccountMetaPacket,

        threadAddress: expectedThreadAddress,
        messageAddress,
        messageSeq: args.messageSeq,
    });
}