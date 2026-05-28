import { EventEmitter } from "node:events";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { InboxChangedEvent, InboxClient, PacketMessageSentEvent } from "xpkt-sdk";
import type { PacketMcpConfig } from "../config/types.js";
import { parsePublicKey } from "../input/index.js";
import { resolveTargetInbox } from "../message/resolve.js";
import { parsePacketResourceUri, type PacketResourceRef } from "./uris.js";

type Subscription = {
    uri: string;
    ref: PacketResourceRef;
    inboxKey?: string;
};

type InboxWatch = {
    key: string;
    inbox: InboxClient;
    sub: PacketEventSubscription;
};

type PacketEventSubscription = {
    stop: () => Promise<void>;
};

const samePubkey = (a: any, b: any): boolean => {
    return Boolean(a?.equals?.(b));
};

export class PacketResourceWatcher extends EventEmitter {
    private readonly subscriptions = new Map<string, Subscription>();
    private readonly inboxWatches = new Map<string, InboxWatch>();
    private readonly inboxWatchPromises = new Map<string, Promise<string>>();
    private messageSub?: PacketEventSubscription;
    private messageWatcherPromise?: Promise<void>;

    constructor(
        private readonly server: McpServer,
        private readonly config: PacketMcpConfig,
    ) {
        super();
    }

    async subscribe(uri: string): Promise<void> {
        const ref = parsePacketResourceUri(uri);
        const subscription: Subscription = { uri, ref };

        if (ref.kind === "inbox") {
            subscription.inboxKey = await this.ensureInboxWatcher(ref);
        } else {
            await this.ensureMessageWatcher();
        }

        this.subscriptions.set(uri, subscription);
    }

    async unsubscribe(uri: string): Promise<void> {
        const sub = this.subscriptions.get(uri);
        this.subscriptions.delete(uri);

        if (sub?.inboxKey && !this.hasInboxSubscribers(sub.inboxKey)) {
            await this.stopInboxWatcher(sub.inboxKey);
        }

        if (!this.hasMessageSubscribers()) {
            await this.stopMessageWatcher();
        }
    }

    async stop(): Promise<void> {
        await this.stopMessageWatcher();
        await Promise.all([...this.inboxWatches.keys()].map((key) => this.stopInboxWatcher(key)));
        this.subscriptions.clear();
    }

    private async ensureMessageWatcher(): Promise<void> {
        if (this.messageSub) return;

        if (this.messageWatcherPromise) {
            await this.messageWatcherPromise;
            return;
        }

        this.messageWatcherPromise = (async () => {
            if (this.messageSub) return;

            this.messageSub = this.config.client.messageEvents.listen({
                onMessage: async (_message, event) => {
                    try {
                        if (
                            !samePubkey(event.sender, this.config.client.walletPublicKey) &&
                            !samePubkey(event.receiver, this.config.client.walletPublicKey)
                        ) {
                            return;
                        }

                        await this.notifyMessageEvent(event);
                    } catch (err) {
                        this.emit("error", err);
                    }
                },
                onError: (err) => this.emit("error", err),
            });
        })();

        try {
            await this.messageWatcherPromise;
        } finally {
            this.messageWatcherPromise = undefined;
        }
    }

    private async stopMessageWatcher(): Promise<void> {
        const sub = this.messageSub;
        this.messageSub = undefined;
        if (sub) await sub.stop().catch(() => undefined);
    }

    private async ensureInboxWatcher(ref: Extract<PacketResourceRef, { kind: "inbox" }>): Promise<string> {
        const owner = ref.owner ? parsePublicKey(ref.owner, "owner") : this.config.client.walletPublicKey;
        const inbox = await resolveTargetInbox({
            client: this.config.client,
            owner,
            inbox: ref.inbox,
        });
        if (!inbox) throw new Error("Inbox not found");

        const key = inbox.address.toBase58();
        if (this.inboxWatches.has(key)) return key;

        let pending = this.inboxWatchPromises.get(key);
        if (!pending) {
            pending = this.startInboxWatcher(key, inbox);
            this.inboxWatchPromises.set(key, pending);
        }

        try {
            return await pending;
        } finally {
            if (this.inboxWatchPromises.get(key) === pending) {
                this.inboxWatchPromises.delete(key);
            }
        }
    }

    private startInboxWatcher(key: string, inbox: InboxClient): Promise<string> {
        return (async () => {
            if (this.inboxWatches.has(key)) return key;

            const sub = inbox.listenEvents({
                clearPages: true,
                onChange: async (changedInbox, event) => {
                    try {
                        await this.notifyInboxEvent(key, changedInbox, event);
                    } catch (err) {
                        this.emit("error", err);
                    }
                },
                onError: (err) => this.emit("error", err),
            });

            const prior = this.inboxWatches.get(key);
            this.inboxWatches.set(key, { key, inbox, sub });
            if (prior) {
                await prior.sub.stop().catch(() => undefined);
            }

            return key;
        })();
    }

    private async stopInboxWatcher(key: string): Promise<void> {
        const watch = this.inboxWatches.get(key);
        this.inboxWatches.delete(key);
        if (watch) await watch.sub.stop().catch(() => undefined);
    }

    private hasMessageSubscribers(): boolean {
        for (const sub of this.subscriptions.values()) {
            if (sub.ref.kind === "activity" || sub.ref.kind === "thread") return true;
        }
        return false;
    }

    private hasInboxSubscribers(key: string): boolean {
        for (const sub of this.subscriptions.values()) {
            if (sub.inboxKey === key) return true;
        }
        return false;
    }

    private async notifyMessageEvent(event: PacketMessageSentEvent): Promise<void> {
        const uris = new Set<string>();
        for (const sub of this.subscriptions.values()) {
            if (sub.ref.kind === "activity") {
                uris.add(sub.uri);
            } else if (sub.ref.kind === "thread" && Number(sub.ref.thread) === event.threadId) {
                uris.add(sub.uri);
            }
        }

        await this.notifyUris(uris);
    }

    private async notifyInboxEvent(key: string, _inbox: InboxClient, _event: InboxChangedEvent): Promise<void> {
        const uris = new Set<string>();
        for (const sub of this.subscriptions.values()) {
            if (sub.inboxKey === key) uris.add(sub.uri);
        }
        await this.notifyUris(uris);
    }

    private async notifyUris(uris: Set<string>): Promise<void> {
        for (const uri of uris) {
            try {
                await this.server.server.sendResourceUpdated({ uri });
                this.emit("updated", uri);
            } catch (err) {
                this.emit("error", err);
            }
        }
    }
}
