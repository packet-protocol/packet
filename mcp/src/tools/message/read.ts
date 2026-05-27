import { z } from "zod";
import { InboxClient } from "xpkt-sdk";
import type { PacketMcpConfig } from "../../config/types.js";
import { defineTool } from "../types.js";
import { jsonText, formatEscrow, formatPayment, formatThreadInfo, messageText, messageToPlainObject, shortKey } from "../../message/format.js";
import { parseOptionalInteger, parsePublicKey } from "../../input/index.js";
import { useMcpCrypto } from "../../message/crypto.js";
import { resolveTargetInbox } from "../../message/resolve.js";
import { contentResult, inboxSummary, resourcesFromRows, textResult } from "./shared.js";

export const ToolsRead = (config: PacketMcpConfig) => [
    ToolInboxes(config),
    ToolInbox(config),
    ToolActivity(config),
    ToolThread(config),
    ToolMessages(config),
    ToolLast(config),
];

const ToolInboxes = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "message_inboxes",
        config: {
            title: "List inboxes",
            description: "List my inboxes",
            inputSchema: { json: z.boolean().optional().describe("Print JSON output") },
        },
        cb: async (options) => {
            useMcpCrypto(client, keypair);
            const inboxes = await InboxClient.LoadMultiple({ client });
            await Promise.all(inboxes.map((i) => i.loadMetadata().catch(() => i)));
            const rows = inboxes.map((inbox) => inboxSummary(inbox));
            if (options.json) return textResult(jsonText(rows));
            return textResult(rows.map((row) => `${row.id} ${shortKey(row.address)} ${row.name || "-"} threads=${row.len} payment=${row.paymentRule ?? "none"}`).join("\n"));
        },
    });
};

const ToolInbox = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "message_inbox",
        config: {
            title: "Load inbox",
            description: "Read current/historical threads in an inbox and show their last messages. Use this for past messages; live event tools only see new events while running.",
            inputSchema: {
                inbox: z.string().describe("Inbox id for owner, or inbox PDA address"),
                owner: z.string().optional().describe("Inbox owner when inbox is numeric"),
                limit: z.number().optional().describe("Thread count"),
                maxPages: z.number().optional().describe("Max inbox archive pages to scan"),
                decrypt: z.boolean().optional().describe("Decrypt message content; set false to keep encrypted/raw content"),
                loadContent: z.boolean().optional().describe("Fetch URL/Irys/Arweave/IPFS body; set false to print pointer/raw content only"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useMcpCrypto(client, keypair);
            const owner = options.owner ? parsePublicKey(options.owner, "owner") : client.walletPublicKey;
            const inbox = await resolveTargetInbox({ client, owner, inbox: options.inbox });
            if (!inbox) throw new Error("Inbox not found");
            await inbox.loadMetadata().catch(() => inbox);

            const threads = await inbox.loadThreadsAcrossBodies({
                includeLastMessage: true,
                limit: Number(options.limit ?? 25),
                maxPages: Number(options.maxPages ?? 5),
            });
            const rows = [];
            for (const thread of threads) {
                const t = thread.Thread;
                const last = thread.LastMessage
                    ? await messageToPlainObject({ client, thread, message: thread.LastMessage, decrypt: options.decrypt !== false, loadContent: options.loadContent !== false })
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

            if (options.json) return contentResult(jsonText({ inbox: inboxSummary(inbox), threads: rows }), resourcesFromRows(rows));
            const lines = [
                `inbox ${inbox.id.toString()} ${shortKey(inbox.address)} owner=${shortKey(inbox.owner)} name=${inbox.Metadata?.name ?? "-"}`,
                `payment=${inbox.Inbox.paymentRule ? formatPayment(inbox.Inbox.paymentRule.inner) : "none"}`,
            ];
            for (const row of rows) {
                lines.push(`\nthread ${row.id} ${shortKey(row.from)} -> ${shortKey(row.to)} msgs=${row.totalMsgs} last=${row.lastUpdated}`);
                if (row.escrow) lines.push(`escrow: ${row.escrow}`);
                if (row.lastMessage) lines.push(messageText(row.lastMessage));
            }
            return contentResult(lines.join("\n"), resourcesFromRows(rows));
        },
    });
};

const ToolActivity = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "message_activity",
        config: {
            title: "Load activity",
            description: "Read current/historical activity threads for the current wallet with last messages. Use this first when you need past conversations or zero-context history.",
            inputSchema: {
                limit: z.number().optional().describe("Thread count"),
                maxPages: z.number().optional().describe("Max activity pages to scan"),
                decrypt: z.boolean().optional().describe("Decrypt message content; set false to keep encrypted/raw content"),
                loadContent: z.boolean().optional().describe("Fetch URL/Irys/Arweave/IPFS body; set false to print pointer/raw content only"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useMcpCrypto(client, keypair);
            const activity = await client.activity(client.walletPublicKey).load();
            const threads = await activity.loadThreadsAcrossHistory({
                includeLastMessage: true,
                limit: Number(options.limit ?? 25),
                maxPages: Number(options.maxPages ?? 5),
            });
            const rows = [];
            for (const thread of threads) {
                const t = thread.Thread;
                const last = thread.LastMessage
                    ? await messageToPlainObject({ client, thread, message: thread.LastMessage, decrypt: options.decrypt !== false, loadContent: options.loadContent !== false })
                    : null;
                rows.push({ id: t.id, from: t.from.toBase58(), to: t.to.toBase58(), lastUpdated: t.lastUpdated, totalMsgs: t.totalMsgs, lastMessage: last });
            }

            if (options.json) return contentResult(jsonText(rows), resourcesFromRows(rows));
            const lines = rows.map((row) => [
                `thread ${row.id} ${shortKey(row.from)} -> ${shortKey(row.to)} msgs=${row.totalMsgs} last=${row.lastUpdated}`,
                row.lastMessage ? messageText(row.lastMessage) : "",
            ].filter(Boolean).join("\n"));
            return contentResult(lines.join("\n\n"), resourcesFromRows(rows));
        },
    });
};

const ToolThread = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "message_thread",
        config: {
            title: "Show thread",
            description: "Show thread info",
            inputSchema: {
                thread: z.string().describe("Thread id"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useMcpCrypto(client, keypair);
            const thread = await client.thread(parseOptionalInteger(options.thread, "thread")!).loadRetrying();
            return textResult(options.json ? jsonText(thread.Thread) : formatThreadInfo(thread));
        },
    });
};

const ToolMessages = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "message_messages",
        config: {
            title: "Load messages",
            description: "Read current/historical messages from an existing thread. This is for past thread history, not live event listening.",
            inputSchema: {
                thread: z.string().describe("Thread id"),
                limit: z.number().optional().describe("Message count"),
                fromSeq: z.number().optional().describe("Start seq"),
                direction: z.enum(["backward", "forward"]).optional().describe("backward or forward"),
                decrypt: z.boolean().optional().describe("Decrypt message content; set false to keep encrypted/raw content"),
                loadContent: z.boolean().optional().describe("Fetch URL/Irys/Arweave/IPFS body; set false to print pointer/raw content only"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useMcpCrypto(client, keypair);
            const thread = await client.thread(parseOptionalInteger(options.thread, "thread")!).loadRetrying();
            const messages = await thread.loadMessages({
                limit: Number(options.limit ?? 50),
                fromSeq: options.fromSeq,
                direction: options.direction === "forward" ? "forward" : "backward",
            });
            messages.sort((a: any, b: any) => a.msgSeq - b.msgSeq);

            const rows = [];
            for (const message of messages) {
                rows.push(await messageToPlainObject({ client, thread, message, decrypt: options.decrypt !== false, loadContent: options.loadContent !== false }));
            }
            if (options.json) return contentResult(jsonText(rows), resourcesFromRows(rows));
            return contentResult(rows.map(messageText).join("\n\n"), resourcesFromRows(rows));
        },
    });
};

const ToolLast = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "message_last",
        config: {
            title: "Load last message",
            description: "Read the latest current/historical message from an existing thread.",
            inputSchema: {
                thread: z.string().describe("Thread id"),
                decrypt: z.boolean().optional().describe("Decrypt message content; set false to keep encrypted/raw content"),
                loadContent: z.boolean().optional().describe("Fetch URL/Irys/Arweave/IPFS body; set false to print pointer/raw content only"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useMcpCrypto(client, keypair);
            const thread = await client.thread(parseOptionalInteger(options.thread, "thread")!).loadRetrying();
            const message = await thread.loadLastMessage();
            if (!message) return textResult("No messages");
            const row = await messageToPlainObject({ client, thread, message, decrypt: options.decrypt !== false, loadContent: options.loadContent !== false });
            if (options.json) return contentResult(jsonText(row), row.resources);
            return contentResult(messageText(row), row.resources);
        },
    });
};
