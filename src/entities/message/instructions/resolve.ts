import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";

import type { MessageType } from "../types";
import type { Payment } from "../../payment/types";
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
    skipActivityCreation?: boolean;
    skipInboxArchivalIx?: boolean;
    /**
     * only valid for already existing threads.
     */
    skipThreadLoad?: boolean;
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
        payment: Payment | null;
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
            vaultTokenAccount?: PublicKey;
            tokenProgram: PublicKey;
            associatedTokenProgram: PublicKey;
        } | null;
    };
    payment: {
        instructions: TransactionInstruction[];
        tokenProgram: PublicKey | null;
    };
};

export const ResolveMessageInputAndAccounts = async (
    connection: Connection,
    sender: PublicKey,
    params: CreateMessageInputAndAccountsParams,
    creatingThread: boolean = false,
): Promise<ResolvedMessageInputAndAccounts> => {
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

    let messagePayment: Payment | null = null;

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
                    sender,
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

        //
        // If target inbox has a non-escrow payment rule and the requested destination
        // matches the rule destination, use it without an ATA existence check.
        //
        if (
            params.targetInbox?.paymentRule &&
            params.targetInbox.paymentRule.escrow === null &&
            params.targetInbox.paymentRule.inner.mint.equals(mint)
        ) {
            if (params.payment.to) {
                if (params.payment.to.type === "ata") {
                    const owner = params.payment.to.owner ?? params.threadInfo.to;
                    const ata = Pda.associatedTokenAddress(
                        mint,
                        owner,
                        tokenProgram,
                    );

                    if (ata.equals(params.targetInbox.paymentRule.inner.to)) {
                        toTokenAccount = ata;
                    }
                } else if (params.payment.to.type === "raw") {
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
                    params.threadInfo.to,
                    tokenProgram,
                );

                if (ata.equals(params.targetInbox.paymentRule.inner.to)) {
                    toTokenAccount = ata;
                }
            }
        }

        //
        // Normal recipient account resolution.
        //
        if (toTokenAccount === null) {
            if (params.payment.to) {
                if (params.payment.to.type === "ata") {
                    const recipientOwner =
                        params.payment.to.owner ?? params.threadInfo.to;

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
                } else if (params.payment.to.type === "raw") {
                    toTokenAccount = params.payment.to.address;
                } else {
                    throw new Error("Invalid payment recipient type");
                }
            } else {
                if (!(creatingThread && params.targetInbox && params.targetInbox.paymentRule && params.targetInbox.paymentRule.escrow !== null)) {
                    toTokenAccount = Pda.associatedTokenAddress(
                        mint,
                        params.threadInfo.to,
                        tokenProgram,
                    );
                    await ensureAtaExists(
                        params.threadInfo.to,
                        mint,
                        tokenProgram,
                    );
                }
            }
        }

        // If mint is WSOL, make sure sender has enough wrapped SOL in their ATA
        // for manual payment-attached messages too.
        if (mint.equals(WSOL_ID)) {

            if (params.threadInfo.from.equals(params.threadInfo.to)) {
                if (toTokenAccount.equals(fromTokenAccount)) {
                    if (tokenAccountInstructions.length > 0) {
                        tokenAccountInstructions.splice(0, tokenAccountInstructions.length);
                    }
                }
            }

            const ix = await EnsureWrappedSolAmountForAtaIx(connection, sender, params.payment.amount);
            tokenAccountInstructions.push(...ix);
        }

        paymentAccounts = {
            paymentMint: mint,
            fromTokenAccount,
            toTokenAccount,
            tokenProgram,
            associatedTokenProgram,
        };

        //
        // Validate against target inbox payment rule when creating a thread.
        //
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
                const expected = Pda.associatedTokenAddress(
                    mint,
                    params.threadInfo.to,
                    tokenProgram,
                );

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

        messagePayment = {
            amount: params.payment.amount,
            mint,
            to: toTokenAccount,
        };
    } else if (
        creatingThread &&
        params.targetInbox &&
        params.targetInbox.paymentRule &&
        (params.payment === undefined || !("disable" in params.payment))
    ) {
        //
        // Auto-fill payment accounts from target inbox payment rule.
        //
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
                params.threadInfo.to,
                mint,
                tokenProgram,
            );
        }

        // If mint is WSOL, ensure the sender has enough lamports in their WSOL account.
        // Which creates three possible ixs: create WSOL ata, transfer lamports to it, sync it.
        if (mint.equals(WSOL_ID)) {
            if (params.threadInfo.from.equals(params.threadInfo.to)) {
                if (toTokenAccount.equals(fromTokenAccount)) {
                    if (tokenAccountInstructions.length > 0) {
                        tokenAccountInstructions.splice(0, tokenAccountInstructions.length);
                    }
                }
            }

            const ix = await EnsureWrappedSolAmountForAtaIx(connection, sender, paymentRule.inner.amount);
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

        messagePayment = {
            amount: paymentRule.inner.amount,
            mint,
            to: toTokenAccount,
        };
    }

    return {
        message: {
            messageType: MessageTypeToAnchorEnum(params.messageType),
            content: params.content,
            payment: messagePayment,
        },
        accounts: {
            signer: sender,
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