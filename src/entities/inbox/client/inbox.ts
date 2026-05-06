import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

import type { PacketClient } from "../../../client";
import * as Pda from "../../../pda";
import { ClientCache } from "../../../core/cache";

import type { CreateInboxParams, InboxPaymentParams } from "../instructions/create";
import { CreateInboxTx } from "../transactions/create";
import { GetInboxAccount, GetInboxMetadata, InboxAccountToInbox } from "../account/get";
import type { Inbox, InboxMetadata } from "../types";
import { InboxBodyPageClient } from "./inbox-body-page";
import { PacketTransactionClient } from "../../transaction/client";
import { ThreadClient, type SendFirstMsgParams } from "../../thread/client/thread";
import type { DisabledPayment, SendMsgPaymentParams } from "../../message/instructions/resolve";
import type { TxReceiptWithClient } from "../../../types/client";
import { EditInboxPaymentTx } from "../transactions/edit-payment";

export type CreateThreadForInboxParams = SendFirstMsgParams & {
    threadId?: number;
    payment?: SendMsgPaymentParams | DisabledPayment
}

export class InboxClient {
    private readonly bodyPages = new ClientCache<string, InboxBodyPageClient>();

    private constructor(
        private readonly client: PacketClient,
        readonly address: PublicKey,
        readonly owner: PublicKey,
        readonly id: BN,
        private inbox: Inbox,
        private metadata?: InboxMetadata,
    ) { }

    get Inbox(): Inbox {
        return this.inbox;
    }

    get currentIndex(): BN {
        return this.inbox.index;
    }

    get len(): BN {
        return this.inbox.len;
    }

    get Metadata(): InboxMetadata | undefined {
        return this.metadata;
    }

    static async Create(params: {
        client: PacketClient;
        params: CreateInboxParams;
    }): Promise<TxReceiptWithClient<InboxClient>> {
        const inboxId = new BN(params.params.inboxId);
        const inboxPda = Pda.inboxPda(inboxId, params.client.walletPublicKey);

        const tx = await CreateInboxTx(
            params.client.connection,
            params.client.walletPublicKey,
            params.client.program,
            params.params,
        );

        const transactionClient = new PacketTransactionClient(params.client.connection);
        transactionClient.addTransaction(tx);

        const signatures = await transactionClient.submitAndConfirm(params.client.wallet);

        return {
            receipt: signatures,
            client: await InboxClient.Load({
                client: params.client,
                id: inboxPda,
            }),
        };
    }

    /**
     * Load inbox by id or address.
     *
     * @param id - Inbox id (BN or number) for owned inbox or inbox PDA address (PublicKey).
     */
    static async Load(params: {
        client: PacketClient;
        id: PublicKey | BN;
    }): Promise<InboxClient> {
        const inboxAddress =
            params.id instanceof PublicKey
                ? params.id
                : Pda.inboxPda(params.id, params.client.walletPublicKey);

        const inboxAccount = await GetInboxAccount(
            params.client.program,
            inboxAddress,
        );

        if (!inboxAccount) {
            throw new Error(`Inbox ${inboxAddress.toBase58()} does not exist`);
        }

        const inbox = InboxAccountToInbox(inboxAddress, inboxAccount);

        return new InboxClient(
            params.client,
            inboxAddress,
            inbox.owner,
            inbox.id,
            inbox,
        );
    }

    static async LoadFromInbox(params: {
        client: PacketClient;
        inbox: Inbox;
    }): Promise<InboxClient> {
        const inboxAddress = Pda.inboxPda(params.inbox.id, params.inbox.owner);

        return new InboxClient(
            params.client,
            inboxAddress,
            params.inbox.owner,
            params.inbox.id,
            params.inbox,
        );
    }

    static async LoadMultiple(params: {
        client: PacketClient;
        limit?: number;
        offset?: number;
    }): Promise<InboxClient[]> {
        const inboxes: InboxClient[] = [];
        const accounts = await params.client.program.account.inbox.all([
            {
                memcmp: {
                    offset: 16, // discriminator
                    bytes: params.client.walletPublicKey.toBase58(),
                },
            },
        ]);

        const sorted = accounts.sort((a, b) => {
            const inboxA = a.account.id;
            const inboxB = b.account.id;
            return inboxB.cmp(inboxA); // sort by id desc
        });

        const sliced = sorted.slice(params.offset ?? 0, params.limit ? (params.offset ?? 0) + params.limit : undefined);

        for (const acc of sliced) {
            const inbox = InboxAccountToInbox(acc.publicKey, acc.account);
            inboxes.push(
                new InboxClient(
                    params.client,
                    acc.publicKey,
                    inbox.owner,
                    inbox.id,
                    inbox,
                ),
            );
        }

        return inboxes;
    }

    async refresh(options: {
        /**
         * If true, clear loaded body page cache too.
         */
        clearPages?: boolean;
    } = {}): Promise<this> {
        const inboxAccount = await GetInboxAccount(
            this.client.program,
            this.address,
        );

        if (!inboxAccount) {
            throw new Error("Inbox does not exist");
        }

        this.inbox = InboxAccountToInbox(this.address, inboxAccount);

        if (options.clearPages) {
            this.bodyPages.clear();
        }

        return this;
    }

    async loadMetadata() {
        if (this.metadata) {
            return this;
        }

        const metadata = await GetInboxMetadata(this.client.program, this.address);
        this.metadata = metadata || undefined;
        return this;
    }

    /**
     * Static segment size for main inbox body page. Only for `standard` inboxes, as `ephemeral` inboxes dont have body.
     */
    public static readonly InboxSegmentSize = new BN(96);
    /**
     * when to include archive in thread creation:
     * - if inbox is close to reaching max thread count per body page,
     *   we include archive in creation to avoid hitting the limit and having the thread creation fail.
     *   This is a UX improvement to avoid failed thread creation due to archive not being created beforehand.
     * - if inbox doesnt need to have archive yet, ix for archival will return ok if set to optional on ix
     * 
     * currently the threshold is set to `InboxSegmentSize - 5`, meaning when there are 91 threads in the inbox, we start including archive in thread creation.
    */
    public static ShouldIncludeArchiveInThreadCreation(inbox: Inbox): boolean {
        // if inbox has no threads, we can create thread without archive
        if (inbox.len.eq(new BN(0))) {
            return false;
        }

        const ArchivalThreshold = InboxClient.InboxSegmentSize.sub(new BN(5)); // 91

        if (inbox.len.lt(ArchivalThreshold)) {
            return false;
        }

        return true;
    }

    /**
     * Latest/live body page.
     */
    getLatestBody(): InboxBodyPageClient {
        return this.getBody(this.currentIndex);
    }

    async loadLatestBody(options: {
        force?: boolean;
    } = {}): Promise<InboxBodyPageClient> {
        const body = this.getLatestBody();
        await body.load(options.force);
        return body;
    }

    /**
     * Get body by index.
     *
     * index === inbox.index => live body
     * index < inbox.index   => archive body
     */
    getBody(index: BN): InboxBodyPageClient {
        const current = this.currentIndex;
        const kind = index.eq(current) ? "live" : "archive";
        const key = `${kind}:${index.toString()}`;

        return this.bodyPages.getOrCreate(key, () =>
            new InboxBodyPageClient(
                this.client,
                this.address,
                index,
                kind,
            ),
        );
    }

    async loadBody(index: BN, options: {
        force?: boolean;
    } = {}): Promise<InboxBodyPageClient> {
        const body = this.getBody(index);
        await body.load(options.force);
        return body;
    }

    /**
     * Previous page = index - 1.
     */
    getPreviousBody(fromIndex?: BN): InboxBodyPageClient | null {
        const index = fromIndex ?? this.currentIndex;

        if (index.lte(new BN(0))) {
            return null;
        }

        return this.getBody(index.sub(new BN(1)));
    }

    async loadPreviousBody(fromIndex?: BN): Promise<InboxBodyPageClient | null> {
        const page = this.getPreviousBody(fromIndex);

        if (!page) {
            return null;
        }

        await page.load();
        return page;
    }

    /**
     * Load multiple body pages backwards.
     *
     * Example:
     *   inbox.loadBodies({ limit: 3 })
     * loads current, current-1, current-2.
     */
    async loadBodies(options: {
        fromIndex?: BN;
        limit: number;
    }): Promise<InboxBodyPageClient[]> {
        const pages: InboxBodyPageClient[] = [];

        let index = options.fromIndex ?? this.currentIndex;

        for (let i = 0; i < options.limit; i++) {
            if (index.lt(new BN(0))) {
                break;
            }

            const page = await this.loadBody(index);
            pages.push(page);

            if (index.eq(new BN(0))) {
                break;
            }

            index = index.sub(new BN(1));
        }

        return pages;
    }

    /**
     * Main UX helper:
     * Loads latest body, then loads last N threads of that body, then loads last message of each thread (if includeLastMessage is true).
     */
    async loadThreads(options: {
        offset?: number;
        limit?: number;
        includeLastMessage?: boolean;
        concurrentFetchLimit?: number;
        concurrentMessageFetchLimit?: number;
    } = {}): Promise<ThreadClient[]> {
        const latest = await this.loadLatestBody();

        return latest.loadThreads({
            offset: options?.offset,
            limit: options?.limit,
            includeLastMessage: options?.includeLastMessage ?? false,
            inbox: this,
            concurrentFetchLimit: options?.concurrentFetchLimit,
            concurrentMessageFetchLimit: options?.concurrentMessageFetchLimit,
        });
    }

    /**
     * Searches pages backwards until it collects enough threads.
     */
    async loadThreadsAcrossBodies(options: {
        maxPages?: number;
        limit: number;
        includeLastMessage?: boolean;
        concurrentFetchLimit?: number;
        concurrentMessageFetchLimit?: number;
    }) {
        const threads: ThreadClient[] = [];
        const seen = new Set<number>();
        let index = this.currentIndex;
        const maxPages = options.maxPages ?? 5;

        for (let pageNo = 0; pageNo < maxPages; pageNo++) {
            if (threads.length >= options.limit) break;

            const page = await this.loadBody(index);

            // Load a full page because older archive pages can contain duplicates
            // of revived live threads. Deduping after a tiny `remaining` fetch can
            // otherwise under-fill the final result.
            const pageThreads = await page.loadThreads({
                limit: InboxClient.InboxSegmentSize.toNumber(),
                includeLastMessage: options.includeLastMessage ?? false,
                inbox: this,
                concurrentFetchLimit: options.concurrentFetchLimit,
                concurrentMessageFetchLimit: options.concurrentMessageFetchLimit,
            });

            for (const thread of pageThreads) {
                if (seen.has(thread.id)) continue;
                seen.add(thread.id);
                threads.push(thread);
                if (threads.length >= options.limit) break;
            }

            if (threads.length >= options.limit || index.eq(new BN(0))) {
                break;
            }

            index = index.sub(new BN(1));
        }

        return threads;
    }

    // edit inbox payment
    async editPayment(params: {
        payment: InboxPaymentParams | null,
    }): Promise<TxReceiptWithClient<InboxClient>> {
        const inboxPda = this.address;

        const tx = await EditInboxPaymentTx(
            this.client.connection,
            this.client.walletPublicKey,
            this.client.program,
            inboxPda,
            params.payment,
        );

        const transactionClient = new PacketTransactionClient(this.client.connection);
        transactionClient.addTransaction(tx);

        const signatures = await transactionClient.submitAndConfirm(this.client.wallet);

        // refresh inbox data after successful transaction
        await this.refresh();

        return {
            receipt: signatures,
            client: this,
        };
    }

    // create thread
    createThread(params: CreateThreadForInboxParams): Promise<TxReceiptWithClient<ThreadClient>> {
        return ThreadClient.Create({
            client: this.client,
            params: {
                ...params,
                to: this.inbox.owner,
                targetInbox: this,
            },
        });
    }
}