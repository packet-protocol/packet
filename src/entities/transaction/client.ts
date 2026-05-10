import { Connection, Keypair, Transaction } from "@solana/web3.js";
import type {
    Commitment,
    SendOptions,
    SignatureStatus,
    TransactionSignature,
    VersionedTransaction,
} from "@solana/web3.js";
import { PacketWallet } from "../wallet";
import type { Wallet } from "@coral-xyz/anchor";

export type SubmitAndConfirmOptions = {
    commitment?: Commitment;
    sendOptions?: SendOptions;
    timeoutMs?: number;
    pollIntervalMs?: number;
    searchTransactionHistory?: boolean;
    skipSign?: boolean;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class PacketTransactionClient {
    #transactions: (Transaction | VersionedTransaction)[] = [];
    #connection: Connection;

    constructor(connection: Connection) {
        this.#connection = connection;
    }

    get connection(): Connection {
        return this.#connection;
    }

    get transactions(): readonly (Transaction | VersionedTransaction)[] {
        return [...this.#transactions];
    }

    addTransaction(...transactions: (Transaction | VersionedTransaction)[]): this {
        this.#transactions.push(...transactions);
        return this;
    }

    removeTransactionAt(index: number): this {
        this.#assertValidIndex(index);
        this.#transactions.splice(index, 1);
        return this;
    }

    resetTransactions(): this {
        this.#transactions.length = 0;
        return this;
    }

    async sign(wallet: Keypair | PacketWallet | Wallet, index?: number): Promise<this> {
        const adapter = this.#adapter(wallet);
        return this.#signInternal(adapter, index);
    }

    async submit(wallet: Keypair | PacketWallet | Wallet): Promise<string[]> {
        const adapter = this.#adapter(wallet);
        await this.#signInternal(adapter);
        return this.#submitSigned();
    }

    async submitAndConfirm(
        wallet: Keypair | PacketWallet | Wallet,
        options: SubmitAndConfirmOptions = {},
    ): Promise<string[]> {
        const adapter = this.#adapter(wallet);
        if (!options.skipSign) {
            await this.#signInternal(adapter);
        }
        const signatures = await this.#submitSigned(options.sendOptions);

        const commitment = options.commitment ?? this.#connection.commitment ?? "confirmed";

        await Promise.all(
            signatures.map((signature) =>
                this.#confirmSignatureSuccess(signature, {
                    ...options,
                    commitment,
                }),
            ),
        );

        return signatures;
    }

    #adapter(wallet: Keypair | PacketWallet | Wallet): PacketWallet {
        if (wallet instanceof Keypair) {
            return PacketWallet.fromKeypair(wallet);
        }

        if (wallet instanceof PacketWallet) {
            return wallet;
        }

        if ("signTransaction" in wallet && "signAllTransactions" in wallet) {
            return PacketWallet.fromAdapter(wallet);
        }

        throw new Error("Invalid wallet type");
    }

    async #signInternal(adapter: PacketWallet, index?: number): Promise<this> {
        this.#assertHasTransactions();

        if (index === undefined) {
            if (this.#transactions.length === 1) {
                this.#transactions[0] = await adapter.signTransaction(this.#transactions[0]);
            } else {
                this.#transactions = await adapter.signAllTransactions(this.#transactions);
            }

            return this;
        }

        this.#assertValidIndex(index);
        this.#transactions[index] = await adapter.signTransaction(this.#transactions[index]);

        return this;
    }

    async #submitSigned(sendOptions?: SendOptions): Promise<string[]> {
        const signatures: string[] = [];

        for (const tx of this.#transactions) {
            const signature = await this.#connection.sendRawTransaction(
                tx.serialize(),
                sendOptions ?? {
                    //skipPreflight: true,
                },
            );

            signatures.push(signature);
        }

        return signatures;
    }

    #assertHasTransactions(): void {
        if (this.#transactions.length === 0) {
            throw new Error("No transactions");
        }
    }

    #assertValidIndex(index: number): void {
        if (index < 0 || index >= this.#transactions.length) {
            throw new Error("Invalid transaction index");
        }
    }

    async #confirmSignatureSuccess(
        signature: TransactionSignature,
        options: SubmitAndConfirmOptions = {},
    ) {
        const commitment = options.commitment ?? "confirmed";
        const timeoutMs = options.timeoutMs ?? 60_000;
        const pollIntervalMs = options.pollIntervalMs ?? 500;
        const searchTransactionHistory = options.searchTransactionHistory ?? false;

        const startedAt = Date.now();
        let lastStatus: SignatureStatus | null = null;

        while (Date.now() - startedAt < timeoutMs) {
            const result = await this.connection.getSignatureStatuses(
                [signature],
                { searchTransactionHistory },
            );

            const status = result.value[0];

            if (status) {
                lastStatus = status;

                if (status.err) {
                    const logs = await this.#tryGetTransactionLogs(signature, commitment);

                    throw new Error(
                        [
                            `Transaction failed: ${signature}`,
                            `Error: ${this.#stringifyError(status.err)}`,
                            logs ? `Logs:\n${logs.join("\n")}` : undefined,
                        ]
                            .filter(Boolean)
                            .join("\n"),
                    );
                }

                if (this.#statusMeetsCommitment(status, commitment)) {
                    return;
                }
            }

            await sleep(pollIntervalMs);
        }

        throw new Error(
            [
                `Timed out waiting for transaction confirmation: ${signature}`,
                `Target commitment: ${commitment}`,
                `Last status: ${lastStatus ? JSON.stringify(lastStatus) : "null"}`,
            ].join("\n"),
        );
    }

    #statusMeetsCommitment(status: SignatureStatus, commitment: Commitment) {
        const currentLevel = this.#signatureStatusLevel(status);
        const requiredLevel = this.#commitmentLevel(commitment);

        return currentLevel >= requiredLevel;
    }

    #signatureStatusLevel(status: SignatureStatus) {
        if (status.confirmationStatus === "finalized") return 2;
        if (status.confirmationStatus === "confirmed") return 1;
        if (status.confirmationStatus === "processed") return 0;

        // Older RPC compatibility.
        // confirmations === null usually means finalized.
        if (status.confirmations === null) return 2;
        if (typeof status.confirmations === "number") return 0;

        return -1;
    }

    #commitmentLevel(commitment: Commitment) {
        switch (commitment) {
            case "finalized":
            case "root":
            case "max":
                return 2;

            case "confirmed":
            case "single":
            case "singleGossip":
                return 1;

            case "processed":
            case "recent":
            default:
                return 0;
        }
    }

    async #tryGetTransactionLogs(
        signature: TransactionSignature,
        commitment: Commitment,
    ): Promise<string[] | null> {
        try {
            const tx = await this.connection.getTransaction(signature, {
                commitment: commitment === "confirmed" || commitment === "finalized" ? commitment : "confirmed",
                maxSupportedTransactionVersion: 0,
            });

            return tx?.meta?.logMessages ?? null;
        } catch {
            return null;
        }
    }

    #stringifyError(err: unknown) {
        if (typeof err === "string") return err;

        try {
            return JSON.stringify(err);
        } catch {
            return String(err);
        }
    }
}