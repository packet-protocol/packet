import type { PublicKey } from "@solana/web3.js";
import type { PacketClient } from "../../../client";
import { SegmentPageClient, type LoadThreadsOptions } from "../../segment/client";
import { GetActivityAccount } from "../account/get";
import * as Pda from "../../../pda";
import { CreateActivityTx } from "../transactions/create";
import { PacketTransactionClient } from "../../transaction/client";
import type { TxReceiptWithClient } from "../../../types/client";
import { ClientCache } from "../../../core/cache";
import type { PacketIDL } from "../../../idl/packet.idl";
import * as anchor from "@coral-xyz/anchor";
import { NO_INBOX } from "../../../constants";
import { InboxClient } from "../../inbox/client/inbox";
import { type Segment, emptySegment } from "../../segment";
class ActivitySegmentClient extends SegmentPageClient {
    private readonly inboxClients = new ClientCache<string, Promise<InboxClient>>();

    constructor(
        client: PacketClient,
        readonly owner: PublicKey,
        segment?: Segment,
    ) {
        super(client, `activity:${owner.toBase58()}`, segment);
    }

    protected async fetchRawSegment(): Promise<Uint8Array> {
        const address = Pda.activityPda(this.owner);

        const account = await GetActivityAccount(
            this.client.connection,
            this.client.lightRpc,
            this.client.program,
            address,
        );

        if (!account) {
            throw new Error("Activity does not exist");
        }

        return Uint8Array.from(account.data.raw.raw);
    }

    private async loadCachedInboxForThread(
        account: anchor.IdlAccounts<PacketIDL>["thread"],
    ): Promise<InboxClient | undefined> {
        if (!account.inboxId || account.inboxId.eq(NO_INBOX)) {
            return undefined;
        }
        
        const inboxAddress = Pda.inboxPda(account.inboxId, account.to);
        const key = inboxAddress.toBase58();

        return this.inboxClients.getOrCreate(key, () =>
            InboxClient.Load({
                client: this.client,
                id: inboxAddress,
            }),
        );
    }

    async loadThreads(options: LoadThreadsOptions = {}) {
        return super.loadThreads({
            ...options,
            resolveInbox: async ({ account, handle }) => {
                const resolved = await options.resolveInbox?.({ account, handle });

                if (resolved) {
                    return resolved;
                }

                return this.loadCachedInboxForThread(account);
            },
        });
    }
}

export class ActivityClient {
    private segmentClient: ActivitySegmentClient;

    constructor(
        client: PacketClient,
        readonly owner: PublicKey,
    ) {
        this.segmentClient = new ActivitySegmentClient(client, owner);
    }

    get segment(): ActivitySegmentClient {
        return this.segmentClient;
    }

    static async Create(params: {
        client: PacketClient;
        owner: PublicKey
    }): Promise<TxReceiptWithClient<ActivityClient>> {

        const tx = await CreateActivityTx(
            params.client.connection,
            params.client.lightRpc,
            params.client.walletPublicKey,
            params.client.program,
            {
                owner: params.owner,
            },
        );

        const transactionClient = new PacketTransactionClient(params.client.connection);
        transactionClient.addTransaction(tx);

        const signatures = await transactionClient.submitAndConfirm(params.client.wallet);

        const client = new ActivityClient(params.client, params.owner);
        client.segmentClient = new ActivitySegmentClient(params.client, params.owner, emptySegment(30));

        return {
            receipt: signatures,
            client,
        };
    }

    static async Load(params: {
        client: PacketClient;
        owner: PublicKey;
    }): Promise<ActivityClient> {
        const client = new ActivityClient(params.client, params.owner);
        await client.segmentClient.load();
        return client;
    }

    async maybeLoad({force}: {force?: boolean} = {}): Promise<ActivityClient | null> {
        try {
            await this.segmentClient.load(force = false);
            return this;
        } catch (e) {
            if (
                e instanceof Error &&
                e.message.includes("does not exist")
            ) {
                return null;
            }

            throw e;
        }
    }

    async load(): Promise<this> {
        await this.segmentClient.load();
        return this;
    }

    async refresh(): Promise<this> {
        await this.segmentClient.refresh();
        return this;
    }

    async loadThreads(options: {
        offset?: number;
        limit?: number;
        includeLastMessage?: boolean;
        concurrentFetchLimit?: number;
        concurrentMessageFetchLimit?: number;
    } = {}) {
        await this.segmentClient.load();

        return this.segmentClient.loadThreads({
            ...options,
        });
    }
}