import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import type { InboxPaymentParams } from "./create";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../../../constants";
import { CheckIfAssociatedTokenAccountExists } from "../../../providers/token/helpers";
import { CreateAssociatedTokenAccountIx, CreateTokenAccountIx } from "../../../providers/token/instructions";
import * as Pda from "../../../pda";
import type { PacketIxOptions } from "../../transaction/types";

export const EditInboxPaymentIx = async (
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    inboxPda: PublicKey,
    payment: InboxPaymentParams | null,
    options?: PacketIxOptions,
) => {

    const owner = options?.owner ?? signer;

    const vaultPda = Pda.vaultPda();

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

    if (payment) {

        const mint = payment.mint;
        const associatedTokenProgram = ASSOCIATED_TOKEN_PROGRAM_ID;
        let paymentTokenAccount: PublicKey;

        if (payment.escrowEnabled) {
            if (payment.to) throw new Error("Escrow-enabled payments cannot have a recipient specified, as the funds will be held in the inbox'es associated token account until release conditions are met to be transferred to inbox owner.");
        }

        var tokenProgram = payment.tokenProgram ?? null;

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

        if (payment.to) {
            if (payment.to.type === "ata") {
                const recipientOwner = payment.to.owner ?? owner;
                await loadAta(recipientOwner);
            } else if (payment.to.type === "raw") {
                paymentTokenAccount = payment.to.address;
            } else if (payment.to.type === "custom") {
                paymentTokenAccount = payment.to.keypair.publicKey;
                preInstructions.push(
                    ...(await CreateTokenAccountIx(
                        connection,
                        signer,
                        payment.to.owner ?? owner,
                        mint,
                        payment.to.keypair,
                        tokenProgram
                    ))
                );
            } else {
                throw new Error("Invalid payment recipient type");
            }
        } else {
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

        if (payment.escrowEnabled) {
            paymentAccounts.paymentEscrowTokenAccount = Pda.associatedTokenAddress(payment.mint, inboxPda);
        }
    }

    const ix = await program.methods.editInboxPayment({
        paymentRule: payment ? {
            inner: {
                amount: payment.amount,
                mint: payment.mint,
                to: paymentAccounts!.paymentTokenAccount,
            },
            escrowEnabled: payment.escrowEnabled,
        } : null,
    }).accounts({
        signer,
        owner,
        permit: options?.permit ?? null,
        targetInbox: inboxPda,
        ...paymentAccounts,
    }).instruction();

    return [...preInstructions, ix];

}