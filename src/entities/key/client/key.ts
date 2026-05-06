import { PublicKey } from "@solana/web3.js";

import type { PacketClient } from "../../../client";
import { PacketTransactionClient } from "../../transaction/client";
import { CreateKeyTx } from "../transactions/create";
import { EditKeyTx } from "../transactions/edit";
import { GetUserKeyAccount } from "../account/get";
import {
    userKeyToReader,
    keyTypeToReaderAlgorithm,
} from "../utils";
import {
    PacketKeyType,
    type CreateUserKeyParams,
    type EditUserKeyParams,
    type UserDecryptionKey,
    type UserKeyReader,
} from "../types";
import type { TxReceiptWithClient } from "../../../types/client";

export class KeyClient {
    private loadedKey?: UserDecryptionKey;

    constructor(
        private readonly client: PacketClient,
        readonly owner: PublicKey = client.walletPublicKey,
    ) {}

    get Loaded(): boolean {
        return this.loadedKey !== undefined;
    }

    get Key(): UserDecryptionKey {
        if (!this.loadedKey) {
            throw new Error("User key is not loaded");
        }

        return this.loadedKey;
    }

    get Reader(): UserKeyReader {
        return userKeyToReader(this.Key);
    }

    async load(): Promise<this> {
        const res = await GetUserKeyAccount({
            rpc: this.client.lightRpc,
            program: this.client.program,
            owner: this.owner,
        });

        if (!res) {
            throw new Error("User key does not exist");
        }

        this.loadedKey = res.data;
        return this;
    }

    async refresh(): Promise<this> {
        return this.load();
    }

    async exists(): Promise<boolean> {
        const res = await GetUserKeyAccount({
            rpc: this.client.lightRpc,
            program: this.client.program,
            owner: this.owner,
        });

        return res !== null;
    }

    async loadNullable(): Promise<this | null> {
        const res = await GetUserKeyAccount({
            rpc: this.client.lightRpc,
            program: this.client.program,
            owner: this.owner,
        });

        if (!res) {
            return null;
        }

        this.loadedKey = res.data;
        return this;
    }

    /**
     * Create the public key registry account.
     *
     * If params.key is omitted, the program stores the owner's wallet pubkey
     * as Ed25519WalletDerivedX25519.
     */
    static async Create(params: {
        client: PacketClient;
        params?: CreateUserKeyParams;
    }): Promise<TxReceiptWithClient<KeyClient>> {
        const tx = await CreateKeyTx(
            params.client.connection,
            params.client.lightRpc,
            params.client.walletPublicKey,
            params.client.program,
            params.params ?? {},
        );

        const txClient = new PacketTransactionClient(params.client.connection);
        txClient.addTransaction(tx);

        const signatures = await txClient.submitAndConfirm(params.client.wallet);

        const owner = params.params?.owner ?? params.client.walletPublicKey;
        const client = new KeyClient(params.client, owner);

        await client.load();

        return {
            receipt: signatures,
            client,
        };
    }

    /**
     * Easy mode: create key from current PacketClient crypto identity.
     *
     * Best browser-wallet flow:
     *   await client.useWalletPasswordCrypto(...)
     *   await client.createKeyFromCrypto()
     */
    static async CreateFromCrypto(params: {
        client: PacketClient;
        owner?: PublicKey;
    }): Promise<TxReceiptWithClient<KeyClient>> {
        const identity = params.client.crypto.requireIdentity();

        return KeyClient.Create({
            client: params.client,
            params: {
                owner: params.owner ?? params.client.walletPublicKey,
                key: identity.keyPair.publicKey,
                keyType:
                    identity.keyAlg === keyTypeToReaderAlgorithm(PacketKeyType.X25519)
                        ? PacketKeyType.X25519
                        : PacketKeyType.Ed25519WalletDerivedX25519,
            },
        });
    }

    async edit(params: EditUserKeyParams = {}): Promise<TxReceiptWithClient<KeyClient>> {
        const tx = await EditKeyTx(
            this.client.connection,
            this.client.lightRpc,
            this.client.walletPublicKey,
            this.client.program,
            {
                ...params,
                owner: params.owner ?? this.owner,
            },
        );

        const txClient = new PacketTransactionClient(this.client.connection);
        txClient.addTransaction(tx);

        const signatures = await txClient.submitAndConfirm(this.client.wallet);

        await this.refresh();

        return {
            receipt: signatures,
            client: this,
        };
    }

    /**
     * Easy mode: edit key from current PacketClient crypto identity.
     */
    async editFromCrypto(): Promise<TxReceiptWithClient<KeyClient>> {
        const identity = this.client.crypto.requireIdentity();

        const keyType =
            identity.keyAlg === keyTypeToReaderAlgorithm(PacketKeyType.X25519)
                ? PacketKeyType.X25519
                : PacketKeyType.Ed25519WalletDerivedX25519;

        return this.edit({
            owner: this.owner,
            key: identity.keyPair.publicKey,
            keyType,
        });
    }
}