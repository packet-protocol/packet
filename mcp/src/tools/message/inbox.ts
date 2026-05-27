import { z } from "zod";
import { InboxKind } from "xpkt-sdk";
import type { PacketMcpConfig } from "../../config/types.js";
import { defineTool } from "../types.js";
import { jsonText, formatPayment, shortKey } from "../../message/format.js";
import { parseOptionalInteger, parsePublicKey, requiredString } from "../../input/index.js";
import { buildInboxWsolPaymentRule } from "../../message/payment.js";
import { resolveTargetInbox } from "../../message/resolve.js";
import { txOptions } from "../../tx/index.js";
import { inboxSummary, textResult } from "./shared.js";

export const ToolsInbox = (config: PacketMcpConfig) => [
    ToolCreateInbox(config),
    ToolEditInboxPayment(config),
];

const ToolCreateInbox = ({ client }: PacketMcpConfig) => {
    return defineTool({
        name: "message_create_inbox",
        config: {
            title: "Create inbox",
            description: "Create a Packet inbox, optionally with a WSOL payment wall",
            inputSchema: {
                inbox: z.string().optional().describe("Inbox id"),
                name: z.string().optional().describe("Inbox display name"),
                uri: z.string().optional().describe("Inbox metadata URI"),
                ephemeral: z.boolean().optional().describe("Create ephemeral inbox instead of standard"),
                paymentSol: z.string().optional().describe("Enable SOL/WSOL payment wall, e.g. 0.05"),
                paymentTo: z.string().optional().describe("Payment destination owner ATA by default, or raw token account with paymentToRaw"),
                paymentToRaw: z.boolean().optional().describe("Treat paymentTo as a token account address, not an owner"),
                escrow: z.boolean().optional().describe("Escrow inbox payments instead of paying receiver immediately"),
                skipPreflight: z.boolean().optional().describe("Skip transaction preflight"),
                priorityFee: z.string().optional().describe("Priority fee in micro lamports"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            const inboxId = parseOptionalInteger(options.inbox, "inbox") ?? 0;
            const payment = buildInboxWsolPaymentRule(options, client.walletPublicKey);
            const res = await client.createInbox({
                inboxId,
                inboxKind: options.ephemeral ? InboxKind.Ephemeral : InboxKind.Standard,
                metadata: options.name ? { name: requiredString(options.name, "name"), uri: options.uri ?? "" } : undefined,
                payment,
                options: txOptions(options),
            });
            const inbox = res.client;
            await inbox.loadMetadata().catch(() => inbox);

            const out = {
                tx: res.receipt,
                inbox: inboxSummary(inbox),
            };
            if (options.json) return textResult(jsonText(out));
            return textResult([
                "inbox created",
                `id: ${inbox.id.toString()}`,
                `address: ${inbox.address.toBase58()}`,
                `owner: ${inbox.owner.toBase58()}`,
                `kind: ${options.ephemeral ? "ephemeral" : "standard"}`,
                `payment: ${inbox.Inbox.paymentRule ? formatPayment(inbox.Inbox.paymentRule.inner) : "none"}`,
                `escrow: ${inbox.Inbox.paymentRule?.escrow ? "yes" : "no"}`,
                `tx: ${res.receipt.join(", ")}`,
            ].join("\n"));
        },
    });
};

const ToolEditInboxPayment = ({ client }: PacketMcpConfig) => {
    return defineTool({
        name: "message_edit_inbox_payment",
        config: {
            title: "Edit inbox payment",
            description: "Edit or clear an inbox WSOL payment wall",
            inputSchema: {
                inbox: z.string().describe("Inbox id for owner, or inbox PDA address"),
                owner: z.string().optional().describe("Inbox owner when inbox is numeric"),
                clearPayment: z.boolean().optional().describe("Remove payment wall"),
                paymentSol: z.string().optional().describe("Enable SOL/WSOL payment wall, e.g. 0.05"),
                paymentTo: z.string().optional().describe("Payment destination owner ATA by default, or raw token account with paymentToRaw"),
                paymentToRaw: z.boolean().optional().describe("Treat paymentTo as a token account address, not an owner"),
                escrow: z.boolean().optional().describe("Escrow inbox payments instead of paying receiver immediately"),
                skipPreflight: z.boolean().optional().describe("Skip transaction preflight"),
                priorityFee: z.string().optional().describe("Priority fee in micro lamports"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            const owner = options.owner ? parsePublicKey(options.owner, "owner") : client.walletPublicKey;
            const inbox = await resolveTargetInbox({ client, owner, inbox: options.inbox });
            if (!inbox) throw new Error("Inbox not found");

            const payment = options.clearPayment ? null : buildInboxWsolPaymentRule(options, client.walletPublicKey);
            if (!options.clearPayment && !payment) throw new Error("Provide paymentSol or clearPayment");

            const res = await inbox.editPayment({
                payment,
                options: txOptions(options),
            });
            await res.client.refresh({ clearPages: false }).catch(() => res.client);

            const out = { tx: res.receipt, inbox: inboxSummary(res.client) };
            if (options.json) return textResult(jsonText(out));
            return textResult([
                "inbox payment updated",
                `inbox: ${res.client.id.toString()} ${shortKey(res.client.address)}`,
                `payment: ${res.client.Inbox.paymentRule ? formatPayment(res.client.Inbox.paymentRule.inner) : "none"}`,
                `escrow: ${res.client.Inbox.paymentRule?.escrow ? "yes" : "no"}`,
                `tx: ${res.receipt.join(", ")}`,
            ].join("\n"));
        },
    });
};
