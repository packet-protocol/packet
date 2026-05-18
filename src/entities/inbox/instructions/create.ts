import { Connection, Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { InboxKind, type InboxMetadata } from "../types";
import type { PacketProgram } from "../../../providers/program";
import * as Pda from "../../../pda";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../../../constants";
import { CheckIfAssociatedTokenAccountExists } from "../../../providers/token/helpers";
import { CreateAssociatedTokenAccountIx, CreateTokenAccountIx } from "../../../providers/token/instructions";
import BN from "bn.js";
import type { PacketIxOptions } from "../../transaction/types";

export type CreateInboxParams = {
    inboxId: BN | number,
    inboxKind?: InboxKind
    metadata?: InboxMetadata,
    payment?: InboxPaymentParams
}

export type InboxPaymentParams = {
    amount: BN,
    mint: PublicKey,
    to?: {
        type: "ata",
        owner?: PublicKey, // if not provided, will be derived as associated token account of `inbox owner`
    } | {
        type: "raw",
        address: PublicKey, // raw token account address, used as-is without any derivation
    } | {
        type: "custom",
        keypair: Keypair, // a new token account will be created with this keypair, and the address will be used
        owner?: PublicKey, // if not provided, will be derived as associated token account of `inbox owner`
    },
    tokenProgram?: PublicKey, // if not provided, manually derived.
    escrowEnabled?: boolean,
}

export const CreateInboxIx = async (
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateInboxParams,
    options?: PacketIxOptions,
) => {
    const owner = options?.owner ?? signer;

    const inboxId = new BN(params.inboxId);

    const vaultPda = Pda.vaultPda(program.programId);
    const inboxPda = Pda.inboxPda(inboxId, owner, program.programId);
    const inboxMetadata = { metadata: params.metadata ? Pda.inboxMetadataPda(inboxPda, program.programId) : null };

    var preInstructions: TransactionInstruction[] = [];

    // payment related accounts
    var paymentAccounts: {
        paymentMint: PublicKey | null,
        paymentTokenAccount: PublicKey | null,
        tokenProgram: PublicKey | null,
        associatedTokenProgram: PublicKey | null,
        paymentEscrowTokenAccount: PublicKey | null,
        paymentVaultTokenAccount: PublicKey | null,
    } = {
        paymentMint: null,
        paymentTokenAccount: null,
        tokenProgram: null,
        associatedTokenProgram: null,
        paymentEscrowTokenAccount: null,
        paymentVaultTokenAccount: null,
    }

    var paymentToAddress: PublicKey;

    if (params.payment) {

        const mint = params.payment.mint;
        const associatedTokenProgram = ASSOCIATED_TOKEN_PROGRAM_ID;
        let paymentTokenAccount: PublicKey |null = null;

        if (params.payment.escrowEnabled) {
            if (params.payment.to) throw new Error("Escrow-enabled payments cannot have a recipient specified, as the funds will be held in the inbox'es associated token account until release conditions are met to be transferred to inbox owner.");
        }

        var tokenProgram = params.payment.tokenProgram ?? null;

        if (!tokenProgram) {
            //check from mint account owner
            const mintAccountInfo = await connection.getAccountInfo(mint);
            if (!mintAccountInfo) {
                throw new Error("Failed to fetch mint account info");
            }
            const mintAccountOwner = mintAccountInfo.owner;
            if (mintAccountOwner.equals(TOKEN_2022_PROGRAM_ID)) {
                tokenProgram = TOKEN_2022_PROGRAM_ID;
            } else if (mintAccountOwner.equals(TOKEN_PROGRAM_ID)) {
                tokenProgram = TOKEN_PROGRAM_ID;
            } else {
                throw new Error("Unable to determine token program for the provided mint. Please specify the token program explicitly in the instruction parameters.");
            }
        }

        const loadAta = async (ataOwner: PublicKey) => {
            paymentTokenAccount = Pda.associatedTokenAddress(mint, ataOwner, tokenProgram);

            let ataExists = await CheckIfAssociatedTokenAccountExists(connection, ataOwner, mint, tokenProgram);
            if (!ataExists) {
                preInstructions.push(
                    CreateAssociatedTokenAccountIx(signer, ataOwner, mint, tokenProgram)
                );
            }
        }

        if (params.payment.to) {
            if (params.payment.to.type === "ata") {
                const recipientOwner = params.payment.to.owner ?? owner;
                await loadAta(recipientOwner);
            } else if (params.payment.to.type === "raw") {
                paymentTokenAccount = params.payment.to.address;
            } else if (params.payment.to.type === "custom") {
                paymentTokenAccount = params.payment.to.keypair.publicKey;
                preInstructions.push(
                    ...(await CreateTokenAccountIx(
                        connection,
                        signer,
                        params.payment.to.owner ?? owner,
                        mint,
                        params.payment.to.keypair,
                        tokenProgram
                    ))
                );
            } else {
                throw new Error("Invalid payment recipient type");
            }
        } else if (!params.payment.escrowEnabled) {
            await loadAta(owner);
        }

        paymentAccounts = {
            paymentMint: mint,
            paymentTokenAccount,
            tokenProgram,
            associatedTokenProgram,
            paymentEscrowTokenAccount: null,
            paymentVaultTokenAccount: Pda.associatedTokenAddress(mint, vaultPda, tokenProgram),
        }

        paymentToAddress = paymentAccounts.paymentTokenAccount!;

        if (params.payment.escrowEnabled) {
            paymentAccounts.paymentTokenAccount = null;
            paymentAccounts.paymentEscrowTokenAccount = Pda.associatedTokenAddress(params.payment.mint, inboxPda, tokenProgram);
            paymentToAddress = paymentAccounts.paymentEscrowTokenAccount;
        }
    }

    if (params.inboxKind === InboxKind.Ephemeral) {
        const ix = await program.methods.createEphemeralInbox({
            id: inboxId,
            metadata: params.metadata ?? null,
            paymentRule: params.payment ? {
                inner: {
                    amount: params.payment.amount,
                    mint: params.payment.mint,
                    to: paymentToAddress!,
                },
                escrowEnabled: params.payment.escrowEnabled,
            } : null,
        }).accounts({
            signer,
            owner,
            permit: options?.permit ?? null,
            ...inboxMetadata,
            ...paymentAccounts,
        })
            .instruction();

        return [...preInstructions, ix];
    } else {
        // default to standard inbox
        const ix = await program.methods.createInbox({
            id: inboxId as any,
            metadata: params.metadata ?? null,
            paymentRule: params.payment ? {
                inner: {
                    amount: params.payment.amount,
                    mint: params.payment.mint,
                    to: paymentToAddress!,
                },
                escrowEnabled: params.payment.escrowEnabled,
            } : null,
        }).accounts({
            signer,
            owner,
            permit: options?.permit ?? null,
            ...inboxMetadata,
            ...paymentAccounts,
        })
            .instruction();

        return [...preInstructions, ix];
    }

}