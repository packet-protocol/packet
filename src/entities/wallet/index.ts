import {
    PublicKey,
    Keypair,
    Transaction,
    VersionedTransaction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

export type PacketWalletAdapter = {
    publicKey: PublicKey | string | (() => PublicKey | string | null | undefined);
    signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
    signAllTransactions: (transactions: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>;
};

export class PacketWallet {
    #publicKey: PublicKey;
    #signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
    #signAllTransactions: (transactions: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>;
    #kind: "keypair" | "adapter";

    private constructor(params: {
        publicKey: PublicKey;
        signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
        signAllTransactions: (transactions: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>;
        kind: "keypair" | "adapter";
    }) {
        this.#publicKey = params.publicKey;
        this.#signTransaction = params.signTransaction;
        this.#signAllTransactions = params.signAllTransactions;
        this.#kind = params.kind;

        Object.freeze(this);
    }

    get publicKey(): PublicKey {
        return this.#publicKey;
    }

    get kind(): "keypair" | "adapter" {
        return this.#kind;
    }

    async signTransaction(transaction: (Transaction | VersionedTransaction)): Promise<Transaction | VersionedTransaction> {
        return this.#signTransaction(transaction);
    }

    async signAllTransactions(transactions: (Transaction | VersionedTransaction)[]): Promise<(Transaction | VersionedTransaction)[]> {
        return this.#signAllTransactions(transactions);
    }

    /**
     * Create empty PacketWallet with a default public key and sign methods that throw errors
     */
    static blank(): PacketWallet {
        const key = PublicKey.default;

        return new PacketWallet({
            publicKey: key,
            kind: "keypair",

            signTransaction: async (_transaction: Transaction | VersionedTransaction) => {
                throw new Error("Blank PacketWallet cannot sign transactions");
            },

            signAllTransactions: async (_transactions: (Transaction | VersionedTransaction)[]) => {
                throw new Error("Blank PacketWallet cannot sign transactions");
            },
        });
    }

    static fromPublicKey(publicKey: PublicKey | string): PacketWallet {
        const normalizedPublicKey = normalizePublicKey(publicKey);

        return new PacketWallet({
            publicKey: normalizedPublicKey,
            kind: "adapter",

            signTransaction: async (_transaction: Transaction | VersionedTransaction) => {
                throw new Error("PacketWallet created from public key cannot sign transactions");
            },

            signAllTransactions: async (_transactions: (Transaction | VersionedTransaction)[]) => {
                throw new Error("PacketWallet created from public key cannot sign transactions");
            },
        });
    }

    static fromKeypair(keypair: Keypair): PacketWallet {
        const publicKey = keypair.publicKey;

        return new PacketWallet({
            publicKey,
            kind: "keypair",

            signTransaction: async (transaction: Transaction | VersionedTransaction) => {
                if (transaction instanceof Transaction) {
                    transaction.sign(keypair);
                } else if (transaction instanceof VersionedTransaction) {
                    transaction.sign([keypair]);
                } else {
                    throw new Error("Invalid transaction type");
                }
                return transaction;
            },

            signAllTransactions: async (transactions: (Transaction | VersionedTransaction)[]) => {
                for (const tx of transactions) {
                    if (tx instanceof Transaction) {
                        tx.sign(keypair);
                    } else if (tx instanceof VersionedTransaction) {
                        tx.sign([keypair]);
                    } else {
                        throw new Error("Invalid transaction type");
                    }
                }

                return transactions;
            },
        });
    }

    static fromAdapter(adapter: PacketWalletAdapter): PacketWallet {
        const publicKey = normalizePublicKey(adapter.publicKey);

        if (typeof adapter.signTransaction !== "function") {
            throw new Error("Invalid wallet adapter: signTransaction must be a function");
        }

        if (typeof adapter.signAllTransactions !== "function") {
            throw new Error("Invalid wallet adapter: signAllTransactions must be a function");
        }

        return new PacketWallet({
            publicKey,
            kind: "adapter",

            signTransaction: async (transaction: Transaction | VersionedTransaction) => {
                return adapter.signTransaction(transaction);
            },

            signAllTransactions: async (transactions: (Transaction | VersionedTransaction)[]) => {
                return adapter.signAllTransactions(transactions);
            },
        });
    }

    toAnchorWallet(): anchor.Provider["wallet"] {
        return {
            publicKey: this.publicKey,
            signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
                return this.#signTransaction(tx) as Promise<T>;
            },
            signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
                return this.#signAllTransactions(transactions) as Promise<T[]>;
            },
        } ;
    }
}

function normalizePublicKey(
    value: PublicKey | string | (() => PublicKey | string | null | undefined),
): PublicKey {
    const resolved = typeof value === "function" ? value() : value;

    if (!resolved) {
        throw new Error("Invalid wallet adapter: publicKey is missing");
    }

    if (resolved instanceof PublicKey) {
        return resolved;
    }

    if (typeof resolved === "string") {
        return new PublicKey(resolved);
    }

    throw new Error("Invalid wallet adapter: publicKey must be a PublicKey or string");
}