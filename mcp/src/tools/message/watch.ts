import { z } from "zod";
import type { PacketMcpConfig } from "../../config/types.js";
import { parseOptionalInteger } from "../../input/index.js";
import { useMcpCrypto } from "../../message/crypto.js";
import { jsonText, messageText, messageToPlainObject, shortKey } from "../../message/format.js";
import { defineTool } from "../types.js";
import { contentResult, resourcesFromRows, textResult } from "./shared.js";

const toCount = (value: unknown): number => {
    const n = Number(value ?? 1);
    if (!Number.isFinite(n) || n <= 0) throw new Error("count must be a positive number");
    return Math.floor(n);
};

const toTimeoutMs = (value: unknown): number => {
    const n = Number(value ?? 60);
    if (!Number.isFinite(n) || n <= 0) throw new Error("timeoutSeconds must be a positive number");
    return Math.floor(n * 1000);
};

export const ToolsWatch = (config: PacketMcpConfig) => [
    ToolWatchIncoming(config),
];

const ToolWatchIncoming = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "message_watch",
        config: {
            title: "Watch incoming messages",
            description: "Live-only wait for new incoming messages for the current wallet. It does not replay missed messages; use message_activity or message_messages for history.",
            inputSchema: {
                thread: z.string().optional().describe("Only watch one thread"),
                count: z.number().optional().describe("Stop after n incoming messages"),
                timeoutSeconds: z.number().optional().describe("Stop waiting after this many seconds"),
                decrypt: z.boolean().optional().describe("Decrypt message content; set false to keep encrypted/raw content"),
                loadContent: z.boolean().optional().describe("Fetch URL/Irys/Arweave/IPFS body; set false to print pointer/raw content only"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useMcpCrypto(client, keypair);

            const threadId = parseOptionalInteger(options.thread, "thread");
            const count = toCount(options.count);
            const timeoutMs = toTimeoutMs(options.timeoutSeconds);
            const rows: any[] = [];

            let sub: { stop: () => Promise<void> } | undefined;

            const stop = async () => {
                if (sub) await sub.stop().catch(() => undefined);
            };

            await new Promise<void>((resolve) => {
                const timeout = setTimeout(resolve, timeoutMs);

                sub = client.messageEvents.listen({
                    threadId,
                    incomingFor: client.walletPublicKey,
                    onError: (err: unknown) => {
                        rows.push({
                            error: err instanceof Error ? err.message : String(err),
                        });
                        clearTimeout(timeout);
                        resolve();
                    },
                    onMessage: async (message, event) => {
                        try {
                            const thread = message.thread ?? client.thread(event.threadId);
                            await thread.loadRetrying({ retries: 5, delay: 500 });
                            await message.loadRetrying(5, 500);

                            const item = await messageToPlainObject({
                                client,
                                thread,
                                message,
                                decrypt: options.decrypt !== false,
                                loadContent: options.loadContent !== false,
                            });

                            rows.push({
                                event: {
                                    threadId: event.threadId,
                                    msgSeq: event.msgSeq,
                                    sender: event.sender.toBase58(),
                                    receiver: event.receiver.toBase58(),
                                    slot: event.slot,
                                    signature: event.signature ?? null,
                                },
                                message: item,
                            });
                        } catch (err) {
                            rows.push({
                                error: err instanceof Error ? err.message : String(err),
                            });
                        }

                        if (rows.length >= count) {
                            clearTimeout(timeout);
                            resolve();
                        }
                    },
                });
            }).finally(async () => {
                await stop();
            });

            if (rows.length === 0) {
                return textResult(`No incoming messages within ${Math.round(timeoutMs / 1000)}s`);
            }

            const messages = rows.map((row) => row.message).filter(Boolean);
            if (options.json) return contentResult(jsonText(rows), resourcesFromRows(messages));

            const text = rows.map((row) => {
                if (row.error) return `[watch:error] ${row.error}`;
                const sig = row.event.signature ? ` sig=${row.event.signature}` : "";
                return [
                    `[watch] incoming thread=${row.event.threadId} seq=${row.event.msgSeq} from=${shortKey(row.event.sender)} slot=${row.event.slot}${sig}`,
                    messageText(row.message),
                ].join("\n");
            }).join("\n\n");

            return contentResult(text, resourcesFromRows(messages));
        },
    });
};
