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
    type CreateMessageInputAndAccountsParams,
} from "../../message/instructions/resolve";

import {
    getCreateThreadAtomicProof,
} from "../../../providers/light/proof/create-thread";
import type { PacketIxOptions } from "../../transaction/types";

export const CreateThreadIx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateMessageInputAndAccountsParams,
    options?: PacketIxOptions,
) => {

    const sender = options?.owner ?? signer;
    
    const receiver = params.threadInfo.to;

    const {
        createAccountsProof,
        metas
    } = await getCreateThreadAtomicProof({
        rpc,
        programId: program.programId,
        threadId: params.threadInfo.id,
        messageSeq: 1,
    });

    const {
        message,
        accounts,
        payment,
    } = await ResolveMessageInputAndAccounts(
        connection,
        signer,
        program,
        sender,
        params,
        true,
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
        associatedTokenProgram: null,
    };

    const ix = await program.methods
        .createThread(
            receiver,
            {
                createAccountsProof,
                threadId: params.threadInfo.id,
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
            ...(accounts.paymentAccounts ?? {}),
        })
        .remainingAccounts(metas.remainingAccounts)
        .instruction();

    return [...payment.instructions, ix];
};