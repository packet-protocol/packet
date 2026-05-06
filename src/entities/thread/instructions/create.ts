import { Connection, PublicKey } from "@solana/web3.js";
import { PackedAccounts, type Rpc } from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program";
import * as Pda from "../../../pda";

import {
    ResolveMessageInputAndAccounts,
    type CreateMessageInputAndAccountsParams,
} from "../../message/instructions/resolve";

import {
    getCreateThreadAtomicProof,
} from "../../../providers/light/proof/create-thread";


export const CreateThreadIx = async (
    connection: Connection,
    rpc: Rpc,
    sender: PublicKey,
    program: PacketProgram,
    params: CreateMessageInputAndAccountsParams,
) => {
    const thread = Pda.threadPda(params.threadInfo.id);

    const {
        createAccountsProof,
        packedAccounts,
    } = await getCreateThreadAtomicProof({
        rpc,
        programId: program.programId,
        threadPda: thread,
        threadId: params.threadInfo.id,
        messageSeq: params.messageSeq,
    });

    const {
        message,
        accounts,
        payment,
    } = await ResolveMessageInputAndAccounts(
        connection,
        sender,
        params,
        true,
    );

    const metas = packedAccounts.toAccountMetas() as ReturnType<
        PackedAccounts["toAccountMetas"]
    > & {
        systemAccountsOffset?: number;
    };

    // Keep the final offset exactly aligned with final account metas.
    createAccountsProof.systemAccountsOffset = metas.systemAccountsOffset ?? 0;

    const emptyOptionalInboxAccounts = {
        targetInbox: null,
        targetInboxBody: null,
        permit: null,
    };

    const emptyOptionalPaymentAccounts = {
        fromTokenAccount: null,
        toTokenAccount: null,
        vaultTokenAccount: null,
        paymentMint: null,
        tokenProgram: null,
        associatedTokenProgram: null,
    };

    const ix = await program.methods
        .createThread({
            createAccountsProof,
            threadId: params.threadInfo.id,
            to: params.threadInfo.to,
            message,
        })
        .accounts({
            feePayer: sender,
            sender,
            compressionConfig: Pda.compressionConfigPda,
            pdaRentSponsor: Pda.rentSponsorPda,

            ...emptyOptionalInboxAccounts,
            ...(accounts.targetInboxAccounts ?? {}),

            ...emptyOptionalPaymentAccounts,
            ...(accounts.paymentAccounts ?? {}),
        })
        .remainingAccounts(metas.remainingAccounts)
        .instruction();


    return [...payment.instructions, ix];
};