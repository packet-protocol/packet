import type { PublicKey } from "@solana/web3.js";

import type { PacketClient } from "../../../client";
import { PacketTransactionClient } from "../../transaction/client";
import { CreateUserTx } from "../transactions/create";
import { EditUserTx } from "../transactions/edit";
import { GetUserAccount } from "../account/get";
import type {
    CreateUserParams,
    EditUserParams,
    PacketUser,
} from "../types";
import type { TxReceiptWithClient } from "../../../types/client";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";

export class UserClient {
    private loadedUser?: PacketUser;

    constructor(
        private readonly client: PacketClient,
        readonly owner: PublicKey = client.walletPublicKey,
    ) { }

    get Loaded(): boolean {
        return this.loadedUser !== undefined;
    }

    get User(): PacketUser {
        if (!this.loadedUser) {
            throw new Error("User is not loaded");
        }

        return this.loadedUser;
    }

    get address(): PublicKey {
        return this.User.address;
    }

    get name(): string {
        return this.User.name;
    }

    get uri(): string {
        return this.User.uri;
    }

    get agent(): PublicKey | null {
        return this.User.agent;
    }

    async exists(): Promise<boolean> {
        const user = await GetUserAccount(
            this.client.program,
            this.owner,
        );

        return user !== null;
    }

    async load(): Promise<this> {
        const user = await GetUserAccount(
            this.client.program,
            this.owner,
        );

        if (!user) {
            throw new Error("User does not exist");
        }

        this.loadedUser = user;
        return this;
    }

    async loadNullable(): Promise<this | null> {
        const user = await GetUserAccount(
            this.client.program,
            this.owner,
        );

        if (!user) {
            return null;
        }

        this.loadedUser = user;
        return this;
    }

    async refresh(): Promise<this> {
        return this.load();
    }

    static async Load(params: {
        client: PacketClient;
        owner: PublicKey;
    }): Promise<UserClient> {
        const user = new UserClient(params.client, params.owner);
        await user.load();
        return user;
    }

    static async Create(params: {
        client: PacketClient;
        params: CreateUserParams;
        options?: PacketIxOptions & PacketTxOptions
    }): Promise<TxReceiptWithClient<UserClient>> {
        const optionsOverride = params.options ?? params.client.defaultTxOptions ?? {};

        const tx = await CreateUserTx(
            params.client.connection,
            params.client.walletPublicKey,
            params.client.program,
            params.params,
            optionsOverride,
        );

        const txClient = new PacketTransactionClient(params.client.connection);
        txClient.addTransaction(...tx);

        const signatures = await txClient.submitAndConfirm(params.client.wallet, optionsOverride?.options);

        const userClient = new UserClient(params.client, params.options?.owner ?? params.client.walletPublicKey);
        await userClient.load();

        return {
            receipt: signatures,
            client: userClient,
        };
    }

    async edit(
        params: Omit<EditUserParams, "owner">,
        options?: PacketIxOptions & PacketTxOptions
    ): Promise<TxReceiptWithClient<UserClient>> {
        const optionsOverride = options ?? this.client.defaultTxOptions ?? {};

        const tx = await EditUserTx(
            this.client.connection,
            this.client.walletPublicKey,
            this.client.program,
            params,
            optionsOverride,
        );

        const txClient = new PacketTransactionClient(this.client.connection);
        txClient.addTransaction(...tx);

        const signatures = await txClient.submitAndConfirm(this.client.wallet, optionsOverride?.options);

        await this.refresh();

        return {
            receipt: signatures,
            client: this,
        };
    }
}