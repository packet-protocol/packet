import type { PacketClient } from "../../client";
import type { Segment } from "./types";
import { parseSegment } from "./parse";
import type { ThreadClient } from "../thread/client/thread";
import * as anchor from "@anchor-lang/core";
import type { PacketIDL } from "../../idl/packet.idl";
import type { Inbox } from "../inbox/types";
import type { InboxClient } from "../inbox/client/inbox";
import { NO_INBOX } from "../../constants";
import { GetThreadAccounts } from "../thread/account/get";

export type LoadThreadsOptions = {
    inbox?: Inbox | InboxClient;

    
    resolveInbox?: (params: {
        account: anchor.IdlEvents<PacketIDL>["thread"];
        handle: ThreadClient;
    }) => Promise<Inbox | InboxClient | undefined> | Inbox | InboxClient | undefined;

    /**
     * Start from this offset inside segment.ids.
     * 0 = newest thread.
     */
    offset?: number;

    /**
     * Max number of threads to return.
     */
    limit?: number;

    /**
     * Actually fetch thread accounts.
     * If false, returns lightweight ThreadClient handles.
     */
    load?: boolean;

    /**
     * Also load the last message for each thread.
     */
    includeLastMessage?: boolean;

    concurrentFetchLimit?: number;
    concurrentMessageFetchLimit?: number;
};

export abstract class SegmentPageClient {

    constructor(
        protected readonly client: PacketClient,
        readonly source: string,
        protected segment?: Segment
    ) {
    }

    get Loaded(): boolean {
        return Boolean(this.segment);
    }

    get Segment(): Segment {
        if (!this.segment) {
            throw new Error(`${this.source} segment is not loaded`);
        }

        return this.segment;
    }

    get threadIds(): number[] {
        return this.Segment.ids;
    }

    async load(force = false): Promise<this> {
        if (this.segment && !force) {
            return this;
        }

        const raw = await this.fetchRawSegment();
        this.segment = parseSegment(raw);

        return this;
    }

    async refresh(): Promise<this> {
        return this.load(true);
    }

    hasThread(threadId: number): boolean {
        return this.Loaded && this.Segment.has(threadId);
    }

    getThreadHandles(options: {
        offset?: number;
        limit?: number;
    } = {}): ThreadClient[] {
        const { offset = 0, limit = this.Segment.ids.length } = options;

        return this.Segment.ids
            .slice(offset, offset + limit)
            .map((threadId) =>
                this.client.thread(threadId),
            );
    }

    async loadThreads(options: LoadThreadsOptions = {}): Promise<ThreadClient[]> {
        await this.load();

        const {
            offset = 0,
            limit = this.Segment.ids.length,
            load = true,
            includeLastMessage = false,
        } = options;

        const handles = this.getThreadHandles({ offset, limit });

        if (!load && !includeLastMessage) {
            return handles;
        }

        const pdas = handles.map((handle) => handle.address);


        const accounts = await GetThreadAccounts(
            this.client.lightRpc,
            this.client.program,
            pdas,
            options.concurrentFetchLimit,
        );

        await Promise.all(
            handles.map(async (handle) => {
                const account = accounts.find((acc) => acc.address.equals(handle.address));

                if (!account) {
                    return;
                }
               
                var inbox: Inbox | InboxClient | undefined;

                if (!account.data.inboxId.eq(NO_INBOX)) {
                    inbox = options.inbox ?? await options.resolveInbox?.({
                        account: account.data,
                        handle,
                    });
                }

                await handle.loadFromAccount({
                    account: account.data,
                    inbox,
                });
            }),
        );

        if (includeLastMessage) {
            const limit = options.concurrentMessageFetchLimit || 10;

            for (let i = 0; i < handles.length; i += limit) {
                await Promise.all(
                    handles.slice(i, i + limit).map(async (handle) => {
                        if (handle.Loaded) {
                            await handle.loadLastMessage();
                        }
                    }),
                );
            }
        }

        return handles;
    }

    protected abstract fetchRawSegment(): Promise<Uint8Array>;
}