import { z } from "zod";
import type { InboxChangedEvent, InboxClient, MessageClient, PacketMessageSentEvent } from "xpkt-sdk";
import type { PacketMcpConfig } from "../../config/types.js";
import { parseOptionalInteger, parseOptionalPublicKey, parsePublicKey } from "../../input/index.js";
import { inboxSize, jsonText, rawEventObject, rawEventText } from "../../message/format.js";
import { resolveTargetInbox } from "../../message/resolve.js";
import { defineTool } from "../types.js";
import { textResult } from "./shared.js";

const toCount = (value: unknown): number => {
    const n = Number(value ?? 1);
    if (!Number.isFinite(n) || n < 0) throw new Error("count must be 0 or a positive number");
    return Math.floor(n);
};

const toTimeoutMs = (value: unknown): number => {
    const n = Number(value ?? 60);
    if (!Number.isFinite(n) || n <= 0) throw new Error("timeoutSeconds must be a positive number");
    return Math.floor(n * 1000);
};

export const ToolsEvents = (config: PacketMcpConfig) => [
    ToolMessageEvents(config),
    ToolInboxEvents(config),
];

const ToolMessageEvents = ({ client }: PacketMcpConfig) => {
    return defineTool({
        name: "message_events",
        config: {
            title: "Listen to live message events",
            description: "Live-only listener for new MessageSent events. It does not return historical messages; use message_activity or message_messages when you need past thread history. (if no filters are set, it defaults to `incoming` to avoid too much noise)",
            inputSchema: {
                thread: z.string().optional().describe("Only listen to one thread id"),
                incoming: z.boolean().optional().describe("Only live incoming messages for the current wallet"),
                outgoing: z.boolean().optional().describe("Only live outgoing messages from the current wallet"),
                sender: z.string().optional().describe("Only events from this sender public key"),
                receiver: z.string().optional().describe("Only events to this receiver public key"),
                count: z.number().optional().describe("Stop after n live events. Use 0 to wait until timeoutSeconds"),
                timeoutSeconds: z.number().optional().describe("Stop waiting after this many seconds"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            const threadId = parseOptionalInteger(options.thread, "thread");
            const sender = parseOptionalPublicKey(options.sender, "sender");
            const receiver = parseOptionalPublicKey(options.receiver, "receiver");
            const count = toCount(options.count);
            const timeoutMs = toTimeoutMs(options.timeoutSeconds);
            const rows: ReturnType<typeof rawEventObject>[] = [];
            const errors: string[] = [];

            let sub: { stop: () => Promise<void> } | undefined;

            const stop = async () => {
                if (sub) await sub.stop().catch(() => undefined);
            };

            const onMessage = async (message: MessageClient, event: PacketMessageSentEvent) => {
                try {
                    await message.loadRetrying(5, 500);
                    rows.push(rawEventObject({ event, message }));
                } catch (err) {
                    errors.push(err instanceof Error ? err.message : String(err));
                }
            };

            await new Promise<void>((resolve) => {
                const timeout = setTimeout(resolve, timeoutMs);
                const doneIfReady = () => {
                    if (count > 0 && rows.length + errors.length >= count) {
                        clearTimeout(timeout);
                        resolve();
                    }
                };

                const params = {
                    sender,
                    receiver,
                    onMessage: async (message: MessageClient, event: PacketMessageSentEvent) => {
                        await onMessage(message, event);
                        doneIfReady();
                    },
                    onError: (err: unknown) => {
                        errors.push(err instanceof Error ? err.message : String(err));
                        doneIfReady();
                    },
                };

                if (threadId !== undefined) {
                    sub = client.messageEvents.listenThread(threadId, params);
                } else if (options.outgoing) {
                    sub = client.messageEvents.listenOutgoing(params);
                } else { // default to listening to incoming if no thread or outgoing filter is set, to avoid too much noise
                    sub = client.messageEvents.listenIncoming(params);
                }
            }).finally(async () => {
                await stop();
            });

            if (options.json) {
                return textResult(jsonText({ events: rows, errors }));
            }

            const lines = [
                ...rows.map(rawEventText),
                ...errors.map((error) => `[events:error] ${error}`),
            ];

            return textResult(lines.length ? lines.join("\n\n") : `No live message events within ${Math.round(timeoutMs / 1000)}s`);
        },
    });
};

const ToolInboxEvents = ({ client }: PacketMcpConfig) => {
    return defineTool({
        name: "message_events_inbox",
        config: {
            title: "Listen to live inbox changes",
            description: "Live-only listener for inbox account changes. It does not return historical threads; use message_inbox or message_activity for past messages.",
            inputSchema: {
                inbox: z.string().describe("Inbox id for owner, or inbox PDA address"),
                owner: z.string().optional().describe("Inbox owner when inbox is numeric"),
                count: z.number().optional().describe("Stop after n live inbox changes. Use 0 to wait until timeoutSeconds"),
                timeoutSeconds: z.number().optional().describe("Stop waiting after this many seconds"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            const owner = options.owner ? parsePublicKey(options.owner, "owner") : client.walletPublicKey;
            const inbox = await resolveTargetInbox({ client, owner, inbox: options.inbox });
            if (!inbox) throw new Error("Inbox not found");

            let previousLen = inboxSize(inbox.Inbox.index.toNumber(), inbox.Inbox.len.toNumber());
            const count = toCount(options.count);
            const timeoutMs = toTimeoutMs(options.timeoutSeconds);
            const rows: any[] = [];
            const errors: string[] = [];
            let sub: { stop: () => Promise<void> } | undefined;

            const stop = async () => {
                if (sub) await sub.stop().catch(() => undefined);
            };

            await new Promise<void>((resolve) => {
                const timeout = setTimeout(resolve, timeoutMs);
                const doneIfReady = () => {
                    if (count > 0 && rows.length + errors.length >= count) {
                        clearTimeout(timeout);
                        resolve();
                    }
                };

                sub = inbox.listenEvents({
                    onChange: async (changedInbox: InboxClient, event: InboxChangedEvent) => {
                        try {
                            const nextLen = inboxSize(changedInbox.Inbox.index.toNumber(), changedInbox.Inbox.len.toNumber());
                            if (nextLen === previousLen) return;

                            rows.push({
                                address: event.address.toBase58(),
                                owner: changedInbox.owner.toBase58(),
                                id: changedInbox.id.toString(),
                                previousLen,
                                newLen: nextLen,
                                slot: event.slot,
                            });
                            previousLen = nextLen;
                        } catch (err) {
                            errors.push(err instanceof Error ? err.message : String(err));
                        }

                        doneIfReady();
                    },
                    onError: (err: unknown) => {
                        errors.push(err instanceof Error ? err.message : String(err));
                        doneIfReady();
                    },
                });
            }).finally(async () => {
                await stop();
            });

            if (options.json) {
                return textResult(jsonText({ events: rows, errors }));
            }

            const lines = [
                ...rows.map((row) => `[event] inbox=${row.id} address=${row.address} previousLen=${row.previousLen} newLen=${row.newLen} slot=${row.slot}`),
                ...errors.map((error) => `[events:error] ${error}`),
            ];

            return textResult(lines.length ? lines.join("\n") : `No live inbox events within ${Math.round(timeoutMs / 1000)}s`);
        },
    });
};
