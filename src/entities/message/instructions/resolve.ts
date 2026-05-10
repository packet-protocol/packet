import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";

import type { MessageType } from "../types";
import type { ThreadInfo } from "../../thread/types";

import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    TokenProgramTypeToProgramId,
    WSOL_ID,
} from "../../../constants";

import * as Pda from "../../../pda";
import { pdas } from "../../../pda";
import { MessageTypeToAnchorEnum } from "../utils/helpers";
import { InboxKind, type Inbox } from "../../inbox/types";
import {
    CheckIfAssociatedTokenAccountExists,
} from "../../../providers/token/helpers";
import {
    CreateAssociatedTokenAccountIx,
    EnsureWrappedSolAmountForAtaIx,
} from "../../../providers/token/instructions";

export type CreateMessageInputAndAccountsParams = {
    messageType: MessageType;
    content: Buffer;
    messageSeq: number;
    payment?: SendMsgPaymentParams | DisabledPayment;
    targetInbox?: Inbox;
    threadInfo: ThreadInfo;
    skipInboxArchivalIx?: boolean;
};

export type SendMsgPaymentParams = {
    amount: BN;
    mint: PublicKey;
    fromTokenAccount?: PublicKey;
    to?:
        | { type: "ata"; owner?: PublicKey; skipCheck?: boolean }
        | { type: "raw"; address: PublicKey };
    tokenProgram?: PublicKey;
};

export type DisabledPayment = {
    disable: true;
};

export type ResolvedMessageInputAndAccounts = {
    message: {
        messageType: ReturnType<typeof MessageTypeToAnchorEnum>;
        content: Buffer;

        // Rust: Option<u64>
        payment: BN | null;
    };
    accounts: {
        signer: PublicKey;
        sender: PublicKey;
        targetInboxAccounts: {
            targetInbox: PublicKey;
            targetInboxBody?: PublicKey;
        } | null;
        paymentAccounts: {
            paymentMint: PublicKey;
            fromTokenAccount: PublicKey;
            toTokenAccount: PublicKey;
            vaultTokenAccount: PublicKey | null;
            tokenProgram: PublicKey;
            associatedTokenProgram: PublicKey;
        } | null;
    };
    payment: {
        instructions: TransactionInstruction[];
        tokenProgram: PublicKey | null;
    };
};

export function resolveThreadReceiver(
    sender: PublicKey,
    thread: ThreadInfo,
): PublicKey {
    if (sender.equals(thread.from)) return thread.to;
    if (sender.equals(thread.to)) return thread.from;

    throw new Error("Sender is not a party of this thread");
}

export const ResolveMessageInputAndAccounts = async (
    connection: Connection,
    signer: PublicKey,
    sender: PublicKey,
    params: CreateMessageInputAndAccountsParams,
    creatingThread: boolean = false,
): Promise<ResolvedMessageInputAndAccounts> => {

    if (params.content.length > 128) {
        console.warn(
            `xpk-sdk: Content length (${params.content.length}) exceeds 128 bytes, which transaction may fail due to transaction size limits.`,
        );
    }

    const receiver = creatingThread
        ? params.threadInfo.to
        : resolveThreadReceiver(sender, params.threadInfo);

    let targetInboxAccounts: {
        targetInbox: PublicKey;
        targetInboxBody?: PublicKey;
    } | null = null;

    if (params.targetInbox) {
        targetInboxAccounts = {
            targetInbox: params.targetInbox.address,
        };

        if (params.targetInbox.kind === InboxKind.Standard) {
            targetInboxAccounts.targetInboxBody = pdas.inboxBody(
                params.targetInbox.address,
            );
        }
    }

    const tokenAccountInstructions: TransactionInstruction[] = [];
    let tokenProgram: PublicKey | null = null;

    let paymentAccounts: ResolvedMessageInputAndAccounts["accounts"]["paymentAccounts"] =
        null;

    let messagePayment: BN | null = null;

    const inferTokenProgramFromMint = async (
        mint: PublicKey,
    ): Promise<PublicKey> => {
        const mintAccountInfo = await connection.getAccountInfo(mint);

        if (!mintAccountInfo) {
            throw new Error("Failed to fetch mint account info");
        }

        if (mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
            return TOKEN_2022_PROGRAM_ID;
        }

        if (mintAccountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
            return TOKEN_PROGRAM_ID;
        }

        throw new Error(
            "Unable to determine token program for the provided mint. Please specify tokenProgram explicitly.",
        );
    };

    const ensureAtaExists = async (
        owner: PublicKey,
        mint: PublicKey,
        tokenProgramId: PublicKey,
    ) => {
        const ataExists = await CheckIfAssociatedTokenAccountExists(
            connection,
            owner,
            mint,
            tokenProgramId,
        );

        if (!ataExists) {
            tokenAccountInstructions.push(
                CreateAssociatedTokenAccountIx(
                    signer,
                    owner,
                    mint,
                    tokenProgramId,
                ),
            );
        }
    };

    if (params.payment && !("disable" in params.payment)) {
        const mint = params.payment.mint;
        const associatedTokenProgram = ASSOCIATED_TOKEN_PROGRAM_ID;

        if (params.payment.tokenProgram) {
            tokenProgram = params.payment.tokenProgram;
        } else if (
            creatingThread &&
            params.targetInbox &&
            params.targetInbox.paymentRule
        ) {
            tokenProgram =
                TokenProgramTypeToProgramId[
                    params.targetInbox.paymentRule.tokenProgram
                ];
        } else {
            tokenProgram = await inferTokenProgramFromMint(mint);
        }

        const fromTokenAccount =
            params.payment.fromTokenAccount ??
            Pda.associatedTokenAddress(mint, sender, tokenProgram);

        let toTokenAccount: PublicKey | null = null;

        if (
            params.targetInbox?.paymentRule &&
            params.targetInbox.paymentRule.escrow === null &&
            params.targetInbox.paymentRule.inner.mint.equals(mint)
        ) {
            if (params.payment.to) {
                if (params.payment.to.type === "ata") {
                    const owner = params.payment.to.owner ?? receiver;
                    const ata = Pda.associatedTokenAddress(
                        mint,
                        owner,
                        tokenProgram,
                    );

                    if (ata.equals(params.targetInbox.paymentRule.inner.to)) {
                        toTokenAccount = ata;
                    }
                } else {
                    if (
                        params.payment.to.address.equals(
                            params.targetInbox.paymentRule.inner.to,
                        )
                    ) {
                        toTokenAccount = params.payment.to.address;
                    }
                }
            } else {
                const ata = Pda.associatedTokenAddress(
                    mint,
                    receiver,
                    tokenProgram,
                );

                if (ata.equals(params.targetInbox.paymentRule.inner.to)) {
                    toTokenAccount = ata;
                }
            }
        }

        if (toTokenAccount === null) {
            if (params.payment.to) {
                if (params.payment.to.type === "ata") {
                    const recipientOwner = params.payment.to.owner ?? receiver;

                    toTokenAccount = Pda.associatedTokenAddress(
                        mint,
                        recipientOwner,
                        tokenProgram,
                    );

                    if (!params.payment.to.skipCheck) {
                        await ensureAtaExists(
                            recipientOwner,
                            mint,
                            tokenProgram,
                        );
                    }
                } else {
                    toTokenAccount = params.payment.to.address;
                }
            } else {
                // Escrow create-thread can derive/use destination from accounts/rule.
                if (
                    !(
                        creatingThread &&
                        params.targetInbox &&
                        params.targetInbox.paymentRule &&
                        params.targetInbox.paymentRule.escrow !== null
                    )
                ) {
                    toTokenAccount = Pda.associatedTokenAddress(
                        mint,
                        receiver,
                        tokenProgram,
                    );

                    await ensureAtaExists(
                        receiver,
                        mint,
                        tokenProgram,
                    );
                }
            }
        }

        if (!toTokenAccount) {
            if (
                creatingThread &&
                params.targetInbox?.paymentRule?.escrow !== null &&
                params.targetInbox?.paymentRule
            ) {
                toTokenAccount = params.targetInbox.paymentRule.inner.to;
            } else {
                throw new Error("Unable to resolve payment destination account");
            }
        }

        if (mint.equals(WSOL_ID)) {
            if (
                sender.equals(receiver) &&
                toTokenAccount.equals(fromTokenAccount)
            ) {
                tokenAccountInstructions.splice(
                    0,
                    tokenAccountInstructions.length,
                );
            }

            const ix = await EnsureWrappedSolAmountForAtaIx(
                connection,
                signer,
                sender,
                params.payment.amount,
            );

            tokenAccountInstructions.push(...ix);
        }

        paymentAccounts = {
            paymentMint: mint,
            fromTokenAccount,
            toTokenAccount,
            vaultTokenAccount: null,
            tokenProgram,
            associatedTokenProgram,
        };

        if (
            creatingThread &&
            params.targetInbox &&
            params.targetInbox.paymentRule
        ) {
            const paymentRule = params.targetInbox.paymentRule;

            if (!paymentRule.inner.mint.equals(mint)) {
                throw new Error(
                    "Payment mint does not match target inbox payment rule",
                );
            }

            if (
                "amount" in paymentRule.inner &&
                params.payment.amount &&
                !params.payment.amount.eq(paymentRule.inner.amount)
            ) {
                throw new Error(
                    "Payment amount does not match target inbox payment rule",
                );
            }

            paymentAccounts.vaultTokenAccount = Pda.associatedTokenAddress(
                mint,
                pdas.vault(),
                tokenProgram,
            );

            if (paymentRule.escrow !== null) {
                const expected = paymentRule.inner.to;

                if (!expected.equals(toTokenAccount)) {
                    throw new Error(
                        "Payment destination does not match escrow destination.",
                    );
                }
            } else if (!toTokenAccount.equals(paymentRule.inner.to)) {
                throw new Error(
                    "Payment destination does not match payment rule destination.",
                );
            }
        }

        // Rust MessageInput.payment = Option<u64>
        messagePayment = params.payment.amount;
    } else if (
        creatingThread &&
        params.targetInbox &&
        params.targetInbox.paymentRule &&
        (params.payment === undefined || !("disable" in params.payment))
    ) {
        const paymentRule = params.targetInbox.paymentRule;
        const mint = paymentRule.inner.mint;
        const associatedTokenProgram = ASSOCIATED_TOKEN_PROGRAM_ID;

        tokenProgram = TokenProgramTypeToProgramId[paymentRule.tokenProgram];

        const fromTokenAccount = Pda.associatedTokenAddress(
            mint,
            sender,
            tokenProgram,
        );

        const toTokenAccount = paymentRule.inner.to;

        if (paymentRule.escrow === null) {
            await ensureAtaExists(
                receiver,
                mint,
                tokenProgram,
            );
        }

        if (mint.equals(WSOL_ID)) {
            if (
                sender.equals(receiver) &&
                toTokenAccount.equals(fromTokenAccount)
            ) {
                tokenAccountInstructions.splice(
                    0,
                    tokenAccountInstructions.length,
                );
            }

            const ix = await EnsureWrappedSolAmountForAtaIx(
                connection,
                signer,
                sender,
                paymentRule.inner.amount,
            );

            tokenAccountInstructions.push(...ix);
        }

        paymentAccounts = {
            paymentMint: mint,
            fromTokenAccount,
            toTokenAccount,
            tokenProgram,
            associatedTokenProgram,
            vaultTokenAccount: Pda.associatedTokenAddress(
                mint,
                pdas.vault(),
                tokenProgram,
            ),
        };

        // Rust MessageInput.payment = Option<u64>
        messagePayment = paymentRule.inner.amount;
    }

    return {
        message: {
            messageType: MessageTypeToAnchorEnum(params.messageType),
            content: params.content,
            payment: messagePayment,
        },
        accounts: {
            signer,
            sender,
            targetInboxAccounts,
            paymentAccounts,
        },
        payment: {
            instructions: tokenAccountInstructions,
            tokenProgram,
        },
    };
};