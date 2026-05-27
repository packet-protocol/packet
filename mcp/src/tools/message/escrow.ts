import { z } from "zod";
import type { PacketMcpConfig } from "../../config/types.js";
import { defineTool } from "../types.js";
import { jsonText } from "../../message/format.js";
import { parseOptionalInteger, parseOptionalPublicKey } from "../../input/index.js";
import { useMcpCrypto } from "../../message/crypto.js";
import { txOptions } from "../../tx/index.js";
import { textResult } from "./shared.js";

export const ToolsEscrow = (config: PacketMcpConfig) => [
    ToolEscrowApprove(config),
    ToolEscrowWithdraw(config),
];

const ToolEscrowApprove = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "message_escrow_approve",
        config: {
            title: "Approve escrow",
            description: "Approve thread escrow",
            inputSchema: {
                thread: z.string().describe("Thread id"),
                skipPreflight: z.boolean().optional().describe("Skip transaction preflight"),
                priorityFee: z.string().optional().describe("Priority fee in micro lamports"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useMcpCrypto(client, keypair);
            const thread = await client.thread(parseOptionalInteger(options.thread, "thread")!).loadRetrying();
            const res = await thread.approveEscrow({ options: txOptions(options) });
            const out = { tx: res.receipt, thread: res.client.id };
            return textResult(options.json ? jsonText(out) : `escrow approved\nthread: ${res.client.id}\ntx: ${res.receipt.join(", ")}`);
        },
    });
};

const ToolEscrowWithdraw = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "message_escrow_withdraw",
        config: {
            title: "Withdraw escrow",
            description: "Withdraw released thread escrow",
            inputSchema: {
                thread: z.string().describe("Thread id"),
                receiverTokenAccount: z.string().optional().describe("Receiver token account override"),
                skipPreflight: z.boolean().optional().describe("Skip transaction preflight"),
                priorityFee: z.string().optional().describe("Priority fee in micro lamports"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useMcpCrypto(client, keypair);
            const thread = await client.thread(parseOptionalInteger(options.thread, "thread")!).loadRetrying();
            const res = await thread.withdrawEscrow({
                receiverTokenAccount: parseOptionalPublicKey(options.receiverTokenAccount, "receiverTokenAccount"),
                options: txOptions(options),
            });
            const out = { tx: res.receipt, thread: res.client.id };
            return textResult(options.json ? jsonText(out) : `escrow withdrawn\nthread: ${res.client.id}\ntx: ${res.receipt.join(", ")}`);
        },
    });
};
