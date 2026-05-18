import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

import type { PacketClient } from "../../../client";
import { ClientCache } from "../../../core/cache";
import type { TxReceiptWithClient } from "../../../types/client";
import { NO_INBOX } from "../../../constants";
import * as Pda from "../../../pda";

import type { Inbox } from "../../inbox/types";
import type { InboxClient } from "../../inbox/client/inbox";
import { ThreadClient } from "../../thread/client/thread";
import {
    DecodeThreadOwnerAccountItem,
    type DecodedThreadAccount,
} from "../../thread/account/get";
import type { ThreadAccountData } from "../../thread/types";

export type ActivityDirection = "from" | "to";

export type ActivityCursorState = {
    from?: string;
    to?: string;
};

export type ActivityLoadThreadsOptions = {
    offset?: number;
    limit?: number;

    /**
     * Fetch count per getCompressedAccountsByOwner call.
     */
    pageLimit?: number;

    /**
     * Max RPC pages per direction.
     */
    maxPages?: number;

    /**
     * Continue from cached cursor instead of rebuilding from zero.
     */
    incremental?: boolean;

    includeLastMessage?: boolean;

    concurrentFetchLimit?: number;
    concurrentMessageFetchLimit?: number;

    inbox?: Inbox | InboxClient;

    resolveInbox?: (params: {
        account: ThreadAccountData;
        handle: ThreadClient;
    }) => Promise<Inbox | InboxClient | undefined> | Inbox | InboxClient | undefined;
};

export type ActivityLoadOptions = {
    pageLimit?: number;
    maxPages?: number;
    incremental?: boolean;
};

type OwnerCompressedResult = {
    items: any[];
    cursor?: string;
};

const THREAD_FROM_OFFSET = 7;
const THREAD_TO_OFFSET = 39;

function asNumber(value: any): number {
    if (typeof value === "number") return value;
    if (typeof value?.toNumber === "function") return value.toNumber();
    return Number(value);
}

function isNoInbox(value: any): boolean {
    if (!value) return true;
    if (typeof value.eq === "function") return value.eq(NO_INBOX);
    return asNumber(value) === asNumber(NO_INBOX);
}

function itemKey(item: any): string {
    return item.address?.toString?.() ?? item.address ?? item.hash?.toString?.() ?? item.hash;
}

function normalizeOwnerResult(result: any): OwnerCompressedResult {
    /**
     * stateless.js shape is usually:
     *   { items, cursor }
     *
     * Some wrappers may return:
     *   { value: { items, cursor } }
     */
    const value = result?.value ?? result;

    return {
        items: value?.items ?? [],
        cursor: value?.cursor,
    };
}

async function getCompressedThreadAccountsByWallet(params: {
    client: PacketClient;
    wallet: PublicKey;
    direction: ActivityDirection;
    cursor?: string;
    limit: number;
}): Promise<OwnerCompressedResult> {
    const offset =
        params.direction === "from"
            ? THREAD_FROM_OFFSET
            : THREAD_TO_OFFSET;

    const result = await params.client.lightRpc.getCompressedAccountsByOwner(
        params.client.program.programId,
        {
            cursor: params.cursor,
            limit: new BN(params.limit),
            filters: [
                {
                    memcmp: {
                        offset,
                        bytes: params.wallet.toBase58(),
                    },
                },
            ],
        },
    );

    return normalizeOwnerResult(result);
}

class ActivityThreadIndexPageClient {
    private readonly threadAccounts = new Map<number, DecodedThreadAccount>();
    private readonly seenItems = new Set<string>();

    constructor(
        private readonly client: PacketClient,
        readonly owner: PublicKey,
    ) { }

    get len(): number {
        return this.threadAccounts.size;
    }

    clear() {
        this.threadAccounts.clear();
        this.seenItems.clear();
    }

    private upsert(account: DecodedThreadAccount) {
        const id = asNumber(account.data.id);
        const prev = this.threadAccounts.get(id);

        if (!prev) {
            this.threadAccounts.set(id, account);
            return;
        }

        const prevUpdated = asNumber(prev.data.lastUpdated);
        const nextUpdated = asNumber(account.data.lastUpdated);

        if (nextUpdated >= prevUpdated) {
            this.threadAccounts.set(id, account);
        }
    }

    pushRawItems(items: any[]) {
        for (const item of items) {
            const key = itemKey(item);

            if (key && this.seenItems.has(key)) {
                continue;
            }

            if (key) {
                this.seenItems.add(key);
            }

            const decoded = DecodeThreadOwnerAccountItem({
                program: this.client.program,
                item,
            });

            if (!decoded) {
                continue;
            }

            if (
                !decoded.data.from.equals(this.owner) &&
                !decoded.data.to.equals(this.owner)
            ) {
                continue;
            }

            this.upsert(decoded);
        }
    }

    getAccounts(options: {
        offset?: number;
        limit?: number;
    } = {}): DecodedThreadAccount[] {
        const offset = options.offset ?? 0;
        const limit = options.limit ?? this.threadAccounts.size;

        return Array.from(this.threadAccounts.values())
            .sort((a, b) => {
                const aTime = asNumber(a.data.lastUpdated);
                const bTime = asNumber(b.data.lastUpdated);

                if (aTime !== bTime) return bTime - aTime;

                return asNumber(b.data.id) - asNumber(a.data.id);
            })
            .slice(offset, offset + limit);
    }
}

export class ActivityClient {
    private readonly page: ActivityThreadIndexPageClient;

    private readonly threadClients = new ClientCache<string, Promise<ThreadClient>>();
    private readonly inboxClients = new ClientCache<string, Promise<InboxClient>>();

    private cursors: ActivityCursorState = {};
    private fullyLoaded = false;

    constructor(
        private readonly client: PacketClient,
        readonly owner: PublicKey,
    ) {
        this.page = new ActivityThreadIndexPageClient(client, owner);
    }

    get len(): number {
        return this.page.len;
    }

    get cursorsState(): ActivityCursorState {
        return { ...this.cursors };
    }

    static async Load(params: {
        client: PacketClient;
        owner?: PublicKey;
    }): Promise<ActivityClient> {
        const owner = params.owner ?? params.client.walletPublicKey;

        const activity = new ActivityClient(
            params.client,
            owner,
        );

        await activity.load();

        return activity;
    }

    static async LoadMultiple(params: {
        client: PacketClient;
        owners?: PublicKey[];
        limit?: number;
    }): Promise<ActivityClient[]> {
        const owners = params.owners ?? [params.client.walletPublicKey];

        const clients = await Promise.all(
            owners.slice(0, params.limit).map((owner) =>
                ActivityClient.Load({
                    client: params.client,
                    owner,
                }),
            ),
        );

        return clients;
    }

    static async Create(params: {
        client: PacketClient;
        owner?: PublicKey;
    }): Promise<TxReceiptWithClient<ActivityClient>> {
        const client = await ActivityClient.Load({
            client: params.client,
            owner: params.owner,
        });

        return {
            receipt: [],
            client,
        };
    }

    static async CreateOrLoad(params: {
        client: PacketClient;
        owner?: PublicKey;
    }): Promise<TxReceiptWithClient<ActivityClient> | { receipt: []; client: ActivityClient }> {
        const client = await ActivityClient.Load({
            client: params.client,
            owner: params.owner,
        });

        return {
            receipt: [],
            client,
        };
    }

    async refresh(options: {
        clearPages?: boolean;
        pageLimit?: number;
        maxPages?: number;
    } = {}): Promise<this> {
        if (options.clearPages) {
            this.page.clear();
            this.cursors = {};
            this.fullyLoaded = false;

            await this.load({
                pageLimit: options.pageLimit,
                maxPages: options.maxPages,
            });

            return this;
        }

        await this.load({
            pageLimit: options.pageLimit,
            maxPages: options.maxPages,
            incremental: true,
        });

        return this;
    }

    async load(options: ActivityLoadOptions = {}): Promise<this> {
        const pageLimit = options.pageLimit ?? 100;
        const maxPages = options.maxPages ?? Number.MAX_SAFE_INTEGER;
        const incremental = options.incremental ?? false;

        if (!incremental) {
            this.page.clear();
            this.cursors = {};
            this.fullyLoaded = false;
        }

        await Promise.all([
            this.loadDirection({
                direction: "from",
                pageLimit,
                maxPages,
                incremental,
            }),
            this.loadDirection({
                direction: "to",
                pageLimit,
                maxPages,
                incremental,
            }),
        ]);

        if (!incremental && maxPages === Number.MAX_SAFE_INTEGER) {
            this.fullyLoaded = true;
        }

        return this;
    }

    private async loadDirection(params: {
        direction: ActivityDirection;
        pageLimit: number;
        maxPages: number;
        incremental: boolean;
    }) {
        let cursor = params.incremental
            ? this.cursors[params.direction]
            : undefined;

        for (let pageNo = 0; pageNo < params.maxPages; pageNo++) {
            const result = await getCompressedThreadAccountsByWallet({
                client: this.client,
                wallet: this.owner,
                direction: params.direction,
                cursor,
                limit: params.pageLimit,
            });

            this.page.pushRawItems(result.items);

            const last = result.items[result.items.length - 1];
            const nextCursor = result.cursor ?? last?.hash?.toString?.() ?? last?.hash;

            if (nextCursor) {
                this.cursors[params.direction] = nextCursor;
            }

            if (!result.cursor || result.items.length === 0) {
                break;
            }

            cursor = result.cursor;
        }
    }

    private async resolveInbox(params: {
        account: ThreadAccountData;
        handle: ThreadClient;
        options: ActivityLoadThreadsOptions;
    }): Promise<Inbox | InboxClient | undefined> {
        if (params.options.inbox) {
            return params.options.inbox;
        }

        const custom = await params.options.resolveInbox?.({
            account: params.account,
            handle: params.handle,
        });

        if (custom) {
            return custom;
        }

        if (isNoInbox(params.account.inboxId)) {
            return undefined;
        }

        const { InboxClient: IC } = await import("../../inbox/client/inbox");

        const inboxAddress = Pda.inboxPda(
            params.account.inboxId,
            params.account.to,
            this.client.program.programId
        );

        return this.inboxClients.getOrCreate(
            inboxAddress.toBase58(),
            () =>
                IC.Load({
                    client: this.client,
                    id: inboxAddress,
                }),
        );
    }

    getThreadAccounts(options: {
        offset?: number;
        limit?: number;
    } = {}): DecodedThreadAccount[] {
        return this.page.getAccounts(options);
    }

    async loadThreads(options: ActivityLoadThreadsOptions = {}): Promise<ThreadClient[]> {
        if (!this.fullyLoaded && this.len === 0) {
            await this.load({
                pageLimit: options.pageLimit,
                maxPages: options.maxPages,
                incremental: options.incremental,
            });
        } else if (options.incremental) {
            await this.refresh({
                pageLimit: options.pageLimit,
                maxPages: options.maxPages,
            });
        }

        const accounts = this.getThreadAccounts({
            offset: options.offset,
            limit: options.limit,
        });

        const handles = await Promise.all(
            accounts.map((account) => {
                const id = asNumber(account.data.id);
                const key = `${id}`;

                return this.threadClients.getOrCreate(
                    key,
                    async () => this.client.thread(id),
                );
            }),
        );

        const concurrentFetchLimit = options.concurrentFetchLimit ?? 10;

        for (let i = 0; i < handles.length; i += concurrentFetchLimit) {
            const handleBatch = handles.slice(i, i + concurrentFetchLimit);
            const accountBatch = accounts.slice(i, i + concurrentFetchLimit);

            await Promise.all(
                handleBatch.map(async (handle, j) => {
                    const account = accountBatch[j];

                    const inbox = await this.resolveInbox({
                        account: account.data,
                        handle,
                        options,
                    });

                    await handle.loadFromAccount({
                        account: account.data,
                        inbox,
                    });
                }),
            );
        }

        if (options.includeLastMessage) {
            const concurrentMessageFetchLimit =
                options.concurrentMessageFetchLimit ?? 10;

            for (let i = 0; i < handles.length; i += concurrentMessageFetchLimit) {
                const batch = handles.slice(i, i + concurrentMessageFetchLimit);

                await Promise.all(
                    batch.map(async (handle) => {
                        try {
                            await handle.loadLastMessage();
                        } catch {
                            // Message indexing can lag behind thread indexing.
                        }
                    }),
                );
            }
        }

        return handles;
    }

    async loadThreadsAcrossHistory(options: {
        maxPages?: number;
        limit: number;
        pageLimit?: number;
        includeLastMessage?: boolean;
        concurrentFetchLimit?: number;
        concurrentMessageFetchLimit?: number;
    }): Promise<ThreadClient[]> {
        const pageLimit = options.pageLimit ?? 100;
        const maxPages = options.maxPages ?? 5;

        await this.load({
            pageLimit,
            maxPages,
            incremental: false,
        });

        return this.loadThreads({
            limit: options.limit,
            includeLastMessage: options.includeLastMessage,
            concurrentFetchLimit: options.concurrentFetchLimit,
            concurrentMessageFetchLimit: options.concurrentMessageFetchLimit,
        });
    }

    async exists(): Promise<boolean> {
        if (this.len > 0) {
            return true;
        }

        await this.load({
            pageLimit: 1,
            maxPages: 1,
        });

        return this.len > 0;
    }
}