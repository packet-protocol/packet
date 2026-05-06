import { Connection, PublicKey } from "@solana/web3.js";
import { PackedAccounts, type Rpc } from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program";
import * as Pda from "../../../pda";

import {
    ResolveMessageInputAndAccounts,
    type CreateMessageInputAndAccountsParams,
} from "./resolve";

import {
    getSendMessageProof,
} from "../../../providers/light/proof/send-message";

import { InboxKind } from "../../inbox/types";

export const SendMsgIx = async (
    connection: Connection,
    rpc: Rpc,
    sender: PublicKey,
    program: PacketProgram,
    params: CreateMessageInputAndAccountsParams,
) => {

    const archiveCandidate =
        params.targetInbox && params.targetInbox.kind === InboxKind.Standard
            ? {
                inbox: params.targetInbox.address,
                index: params.targetInbox.index,
            }
            : null;

    const {
        createAccountsProof,
        createAccountsProofWithArchive,
        packedAccounts,
        debug,
    } = await getSendMessageProof({
        rpc,
        programId: program.programId,
        threadId: params.threadInfo.id,
        messageSeq: params.messageSeq,
        archive: archiveCandidate,
    });

    const {
        message,
        accounts,
        payment,
    } = await ResolveMessageInputAndAccounts(
        connection,
        sender,
        params,
        false,
    );

    const metas = packedAccounts.toAccountMetas() as ReturnType<
        PackedAccounts["toAccountMetas"]
    > & {
        systemAccountsOffset?: number;
    };

    createAccountsProof.systemAccountsOffset = metas.systemAccountsOffset ?? 0;

    if (createAccountsProofWithArchive) {
        createAccountsProofWithArchive.systemAccountsOffset =
            metas.systemAccountsOffset ?? 0;
    }

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
    };

    const ix = await program.methods
        .sendMsg({
            createAccountsProof,
            createAccountsProofWithArchive,
            threadId: params.threadInfo.id,
            message,
        })
        .accounts({
            signer: sender,
            sender,
            fromActivity: Pda.activityPda(params.threadInfo.from),
            toActivity: Pda.activityPda(params.threadInfo.to),

            ...emptyOptionalInboxAccounts,
            ...(accounts.targetInboxAccounts ?? {}),

            ...emptyOptionalPaymentAccounts,
            ...(accounts.paymentAccounts ?? {}),
        })
        .remainingAccounts(metas.remainingAccounts)
        .instruction();

    return [...payment.instructions, ix];
};