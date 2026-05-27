import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { InboxClient } from "xpkt-sdk";
import type { PacketMcpConfig } from "../config/types.js";
import { parseOptionalInteger, parsePublicKey } from "../input/index.js";
import { formatEscrow, formatPayment, formatThreadInfo, jsonText, messageText, messageToPlainObject, type McpContentBlock } from "../message/format.js";
import { useMcpCrypto } from "../message/crypto.js";
import { resolveTargetInbox } from "../message/resolve.js";
import { parsePacketResourceUri } from "./uris.js";

const numberParam = (uri: URL, name: string, fallback: number): number => {
    const value = uri.searchParams.get(name);
    if (value === null || value === "") return fallback;
    return parseOptionalInteger(value, name) ?? fallback;
};

const boolParam = (uri: URL, name: string, fallback: boolean): boolean => {
    const value = uri.searchParams.get(name);
    if (value === null || value === "") return fallback;
    return value !== "false" && value !== "0";
};

const resourceContents = (uri: URL, value: unknown, resources: McpContentBlock[] = []): ReadResourceResult => {
    return {
        contents: [
            {
                uri: uri.toString(),
                mimeType: "application/json",
                text: jsonText(value),
            },
            ...resources.flatMap((block) => {
                if (block.type !== "resource") return [];
                return [{
                    ...block.resource,
                    uri: block.resource.uri,
                }];
            }),
        ],
    };
};

const resourcesFromRows = (rows: any[]): McpContentBlock[] => {
    return rows.flatMap((row) => row?.resources ?? row?.lastMessage?.resources ?? []);
};

const inboxSummary = (inbox: InboxClient) => {
    return {
        address: inbox.address.toBase58(),
        id: inbox.id.toString(),
        owner: inbox.owner.toBase58(),
        kind: inbox.Inbox?.kind,
        name: inbox.Metadata?.name ?? "",
        uri: inbox.Metadata?.uri ?? "",
        len: inbox.len?.toString?.() ?? "",
        currentIndex: inbox.currentIndex?.toString?.() ?? "",
        lastUpdated: inbox.Inbox?.lastUpdated,
        paymentRule: inbox.Inbox?.paymentRule ? formatPayment(inbox.Inbox.paymentRule.inner) : null,
        escrow: inbox.Inbox?.paymentRule?.escrow ? true : false,
    };
};

export const readPacketResource = async (config: PacketMcpConfig, uri: URL): Promise<ReadResourceResult> => {
    const ref = parsePacketResourceUri(uri.toString());
    useMcpCrypto(config.client, config.keypair);

    if (ref.kind === "activity") {
        return readActivityResource(config, uri);
    }

    if (ref.kind === "thread") {
        return readThreadResource(config, uri, ref.thread);
    }

    return readInboxResource(config, uri, ref.inbox, ref.owner);
};

const readActivityResource = async ({ client }: PacketMcpConfig, uri: URL): Promise<ReadResourceResult> => {
    const activity = await client.activity(client.walletPublicKey).load();
    const threads = await activity.loadThreadsAcrossHistory({
        includeLastMessage: true,
        limit: numberParam(uri, "limit", 25),
        maxPages: numberParam(uri, "maxPages", 5),
    });

    const rows = [];
    for (const thread of threads) {
        const t = thread.Thread;
        const last = thread.LastMessage
            ? await messageToPlainObject({
                client,
                thread,
                message: thread.LastMessage,
                decrypt: boolParam(uri, "decrypt", true),
                loadContent: boolParam(uri, "loadContent", true),
            })
            : null;
        rows.push({
            id: t.id,
            from: t.from.toBase58(),
            to: t.to.toBase58(),
            lastUpdated: t.lastUpdated,
            totalMsgs: t.totalMsgs,
            lastMessage: last,
        });
    }

    return resourceContents(uri, rows, resourcesFromRows(rows));
};

const readThreadResource = async ({ client }: PacketMcpConfig, uri: URL, threadId: string): Promise<ReadResourceResult> => {
    const thread = await client.thread(parseOptionalInteger(threadId, "thread")!).loadRetrying();
    const messages = await thread.loadMessages({
        limit: numberParam(uri, "limit", 50),
        fromSeq: parseOptionalInteger(uri.searchParams.get("fromSeq"), "fromSeq"),
        direction: uri.searchParams.get("direction") === "forward" ? "forward" : "backward",
    });
    messages.sort((a: any, b: any) => a.msgSeq - b.msgSeq);

    const rows = [];
    for (const message of messages) {
        rows.push(await messageToPlainObject({
            client,
            thread,
            message,
            decrypt: boolParam(uri, "decrypt", true),
            loadContent: boolParam(uri, "loadContent", true),
        }));
    }

    return resourceContents(uri, {
        thread: formatThreadInfo(thread),
        messages: rows,
        text: rows.map(messageText).join("\n\n"),
    }, resourcesFromRows(rows));
};

const readInboxResource = async ({ client }: PacketMcpConfig, uri: URL, inboxArg: string, ownerArg?: string): Promise<ReadResourceResult> => {
    const owner = ownerArg ? parsePublicKey(ownerArg, "owner") : client.walletPublicKey;
    const inbox = await resolveTargetInbox({ client, owner, inbox: inboxArg });
    if (!inbox) throw new Error("Inbox not found");
    await inbox.loadMetadata().catch(() => inbox);

    const threads = await inbox.loadThreadsAcrossBodies({
        includeLastMessage: true,
        limit: numberParam(uri, "limit", 25),
        maxPages: numberParam(uri, "maxPages", 5),
    });

    const rows = [];
    for (const thread of threads) {
        const t = thread.Thread;
        const last = thread.LastMessage
            ? await messageToPlainObject({
                client,
                thread,
                message: thread.LastMessage,
                decrypt: boolParam(uri, "decrypt", true),
                loadContent: boolParam(uri, "loadContent", true),
            })
            : null;
        rows.push({
            id: t.id,
            from: t.from.toBase58(),
            to: t.to.toBase58(),
            lastUpdated: t.lastUpdated,
            totalMsgs: t.totalMsgs,
            escrow: t.escrowPayment ? formatEscrow(t.escrowPayment) : null,
            lastMessage: last,
        });
    }

    return resourceContents(uri, {
        inbox: inboxSummary(inbox),
        threads: rows,
    }, resourcesFromRows(rows));
};
