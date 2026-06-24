import {
    AddressLookupTableAccount,
    ComputeBudgetProgram,
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";

import type { PipelineBase } from "../types/client.js";

const MAX_COMPUTE_UNITS_PER_TX = 1_400_000;


function isVersioned(tx: Transaction | VersionedTransaction): tx is VersionedTransaction {
    return "version" in tx;
}

function makeComputeBudgetIxs(args: {
    computeUnits?: number;
    priorityFee?: number;
}): TransactionInstruction[] {
    const ixs: TransactionInstruction[] = [];

    if (args.computeUnits) {
        ixs.push(
            ComputeBudgetProgram.setComputeUnitLimit({
                units: Math.min(args.computeUnits, MAX_COMPUTE_UNITS_PER_TX),
            }),
        );
    }

    if (args.priorityFee) {
        ixs.push(
            ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: args.priorityFee,
            }),
        );
    }

    return ixs;
}

function buildLegacyTx(args: {
    payer: PublicKey;
    recentBlockhash: string;
    instructions: TransactionInstruction[];
}): Transaction {
    const tx = new Transaction({
        feePayer: args.payer,
        recentBlockhash: args.recentBlockhash,
    });

    tx.add(...args.instructions);

    return tx;
}

function buildV0Tx(args: {
    payer: PublicKey;
    recentBlockhash: string;
    instructions: TransactionInstruction[];
    lookupTables: AddressLookupTableAccount[];
}): VersionedTransaction {
    const message = new TransactionMessage({
        payerKey: args.payer,
        recentBlockhash: args.recentBlockhash,
        instructions: args.instructions,
    }).compileToV0Message(args.lookupTables);

    return new VersionedTransaction(message);
}

function buildTx(args: {
    payer: PublicKey;
    recentBlockhash: string;
    instructions: TransactionInstruction | TransactionInstruction[];
    lookupTables?: AddressLookupTableAccount[];
    forceV0?: boolean;
}): Transaction | VersionedTransaction {
    const lookupTables = args.lookupTables ?? [];

    if (args.forceV0 || lookupTables.length > 0) {
        return buildV0Tx({
            payer: args.payer,
            recentBlockhash: args.recentBlockhash,
            instructions: Array.isArray(args.instructions) ? args.instructions : [args.instructions],
            lookupTables,
        });
    }

    return buildLegacyTx({
        payer: args.payer,
        recentBlockhash: args.recentBlockhash,
        instructions: Array.isArray(args.instructions) ? args.instructions : [args.instructions],
    });
}

export const HandleTxPipeline = async (
    { instruction, preInstructions }: PipelineBase,
    {
        connection,
        payer,
        computeUnits,
        priorityFee,
        lookupTables = [],
        forceV0 = lookupTables.length > 0,
        recentBlockhash,
    }: {
        connection: Connection;
        payer: PublicKey;
        computeUnits?: number;
        priorityFee?: number;
        lookupTables?: AddressLookupTableAccount[];
        forceV0?: boolean;
        recentBlockhash?: string;
    },
): Promise<(Transaction | VersionedTransaction)[]> => {
    let mainComputeUnits = computeUnits || 0;

     // pre transactions
    const txs: (Transaction | VersionedTransaction)[] = [];
     // pre instructions that are not in their own transaction group and should be added to the main transaction
    const mainPreIxs: TransactionInstruction[] = [];

    var recentBlockhash = recentBlockhash ?? (
        await connection.getLatestBlockhash("confirmed")
    ).blockhash;

     // handle pre instructions
    if (preInstructions && preInstructions.length > 0) {
        for (const preIxGroup of preInstructions) {
            if (preIxGroup.instructions.length === 0) continue;
             // seperate tx

            if (preIxGroup.isTxGroup) {
                // create and add a transaction for this group of pre instructions and add compute budget instructions if specified
                const preTxIxs = [
                    ...makeComputeBudgetIxs({
                        computeUnits: preIxGroup.computeUnits,
                        priorityFee,
                    }),
                    ...preIxGroup.instructions,
                ];

                 // add transactions of this group to the list of transactions to send
                txs.push(
                    buildTx({
                        payer,
                        recentBlockhash,
                        instructions: preTxIxs,
                        lookupTables,
                        forceV0,
                    }),
                );
            } else {
                 // add pre instructions to the list of instructions to be included in the main transaction and add compute units if specified
                mainPreIxs.push(...preIxGroup.instructions);

                if (preIxGroup.computeUnits) {
                    mainComputeUnits += preIxGroup.computeUnits;
                }
            }
        }
    }

    var pipelineIxs = Array.isArray(instruction) ? instruction : [instruction];

     // main transaction
    const mainIxs = [
        ...makeComputeBudgetIxs({
            computeUnits: mainComputeUnits,
            priorityFee,
        }),
        ...mainPreIxs,
        ...pipelineIxs,
    ];

    txs.push(
        buildTx({
            payer,
            recentBlockhash,
            instructions: mainIxs,
            lookupTables,
            forceV0,
        }),
    );

    return txs;
};

export function getSerializedTxSize(tx: Transaction | VersionedTransaction): number {
    return tx.serialize().length;
}

export function isPacketVersionedTx(tx: Transaction | VersionedTransaction): tx is VersionedTransaction {
    return isVersioned(tx);
}