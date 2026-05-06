import { Connection, Keypair, SolanaJSONRPCError, TransactionInstruction, type PublicKey } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, WSOL_ID } from "../../constants";
import { associatedTokenAddress } from "../../pda";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";

export const CreateAssociatedTokenAccountIx = (
    signer: PublicKey,
    owner: PublicKey,
    mint: PublicKey,
    tokenProgram = TOKEN_PROGRAM_ID
): TransactionInstruction => {
    const ata = associatedTokenAddress(mint, owner, tokenProgram);

    const keys = [
        { pubkey: signer, isSigner: true, isWritable: true },
        { pubkey: ata, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ];

    let ix = new TransactionInstruction({
        keys,
        programId: ASSOCIATED_TOKEN_PROGRAM_ID,
        data: Buffer.alloc(0),
    });

    return ix;
};

export const CreateTokenAccountIx = async (
    connection: Connection,
    owner: PublicKey,
    mint: PublicKey,
    keypair: Keypair,
    tokenProgram = TOKEN_PROGRAM_ID
): Promise<TransactionInstruction[]> => {

    // 1. Create system account
    const lamports = await connection.getMinimumBalanceForRentExemption(165); // size of token account

    const createAccountIx = anchor.web3.SystemProgram.createAccount({
        fromPubkey: owner,
        newAccountPubkey: keypair.publicKey,
        space: 165, // size of token account
        lamports: lamports,
        programId: tokenProgram,
    });

    // 2. Initialize token account
    const initAccountIx = new TransactionInstruction({
        keys: [
            { pubkey: keypair.publicKey, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: anchor.web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: tokenProgram, isSigner: false, isWritable: false },
        ],
        programId: tokenProgram,
        data: Buffer.from([1, 0, 0, 0]), // InitializeAccount instruction
    });

    // Return both instructions
    return [createAccountIx, initAccountIx];
}

export const EnsureWrappedSolAmountForAtaIx = async (
    connection: Connection,
    owner: PublicKey,
    /**
     * Amount to have in the wrapped SOL account. (lamports)
    */
    amount: BN,
): Promise<TransactionInstruction[]> => {
    
    var lamportsToTransfer = amount;
    var createAccountIx: TransactionInstruction | undefined;

    // get ata
    const ata = associatedTokenAddress(WSOL_ID, owner, TOKEN_PROGRAM_ID);

    // 1: check if associated token account exists, if not create it
    try {
        const ataInfo = await connection.getTokenAccountBalance(ata);
        lamportsToTransfer = lamportsToTransfer.sub(new BN(ataInfo.value.amount));
        
        if (lamportsToTransfer.lte(new BN(0))) {
            // no need to transfer any lamports, return empty array
            return [];
        }
    }catch (err) {
        if (err instanceof SolanaJSONRPCError) {
            createAccountIx = CreateAssociatedTokenAccountIx(owner, owner, WSOL_ID);
        }else {
            throw err;
        }
    }

    // 2: Send lamports to the associated token account
    const transferIx = anchor.web3.SystemProgram.transfer({
        fromPubkey: owner,
        toPubkey: ata,
        lamports: lamportsToTransfer.toNumber(),
    });

    // 3: sync lamports to the new account 
    const syncIx = new TransactionInstruction({
        keys: [
            { pubkey: ata, isSigner: false, isWritable: true },
        ],
        programId: TOKEN_PROGRAM_ID,
        data: Buffer.from([17, 0, 0, 0]), // SyncNative instruction
    });

    // Return all three instructions
    return [createAccountIx, transferIx, syncIx].filter((ix): ix is TransactionInstruction => ix !== undefined);
}

export const WSolCloseAccountIx = (
    owner: PublicKey,
    ata: PublicKey,
): TransactionInstruction => {
    const ix = new TransactionInstruction({
        keys: [
            { pubkey: ata, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: true, isWritable: false },
        ],
        programId: TOKEN_PROGRAM_ID,
        data: Buffer.from([9, 0, 0, 0]), // CloseAccount instruction
    });

    return ix;
}