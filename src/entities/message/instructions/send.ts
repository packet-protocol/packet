import {
    Connection,
    PublicKey,
    SystemProgram,
} from "@solana/web3.js";
import {
    PackedAccounts,
    type Rpc,
} from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program";
import * as Pda from "../../../pda";

import {
    ResolveMessageInputAndAccounts,
    resolveThreadReceiver,
    type CreateMessageInputAndAccountsParams,
} from "./resolve";

import {
    getSendMessageProof,
} from "../../../providers/light/proof/send-message";
import type { PacketIxOptions } from "../../transaction/types";


export const SendMsgIx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateMessageInputAndAccountsParams,
    options?: PacketIxOptions
) => {
    const sender = options?.owner ?? signer;
    
    const receiver = resolveThreadReceiver(sender, params.threadInfo);

    const {
        createAccountsProof,
        threadAccountMeta,
        currentThread,
        metas,
        messageSeq
    } = await getSendMessageProof({
        rpc,
        program,
        threadId: params.threadInfo.id,
        messageSeq: params.messageSeq,
    });

    const {
        message,
        accounts,
        payment,
    } = await ResolveMessageInputAndAccounts(
        connection,
        signer,
        sender,
        {
            ...params,
            messageSeq: messageSeq,
        },
        false,
    );

    const emptyOptionalInboxAccounts = {
        targetInbox: null,
        targetInboxBody: null,
    };

    const emptyOptionalPaymentAccounts = {
        fromTokenAccount: null,
        toTokenAccount: null,
        vaultTokenAccount: null,
        paymentMint: null,
        tokenProgram: null,
    };

    const ix = await program.methods
        .sendMsg(
            receiver,
            {
                createAccountsProof,
                threadAccountMeta,
                currentThread,
                message,
            },
        )
        .accounts({
            signer,
            sender,
            permit: options?.permit ?? null,

            ...emptyOptionalInboxAccounts,
            ...(accounts.targetInboxAccounts ?? {}),

            ...emptyOptionalPaymentAccounts,
            ...(accounts.paymentAccounts
                ? {
                    fromTokenAccount: accounts.paymentAccounts.fromTokenAccount,
                    toTokenAccount: accounts.paymentAccounts.toTokenAccount,
                    vaultTokenAccount: accounts.paymentAccounts.vaultTokenAccount,
                    paymentMint: accounts.paymentAccounts.paymentMint,
                    tokenProgram: accounts.paymentAccounts.tokenProgram,
                }
                : {}),
        })
        .remainingAccounts(metas.remainingAccounts)
        .instruction();

    return [...payment.instructions, ix];
};