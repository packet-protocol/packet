import { z } from "zod";
import type { PacketMcpConfig } from "../../config/types.js";
import { defineTool } from "../types.js";
import { buildMcpPacketEnvelope, stringList } from "../../envelope/index.js";
import { jsonText, formatPayment } from "../../message/format.js";
import { parseOptionalInteger, parsePublicKey, requiredString } from "../../input/index.js";
import { buildWsolPayment } from "../../message/payment.js";
import { loadReaderForOwner, useMcpCrypto } from "../../message/crypto.js";
import { getThreadCounterparty, resolveTargetInbox } from "../../message/resolve.js";
import { prepareMessageContent, type SendInputSource } from "../../message/content/index.js";
import { txOptions } from "../../tx/index.js";
import { textResult } from "./shared.js";

const stringOrStrings = z.union([z.string(), z.array(z.string())]);

type ResolvedSendInput = {
    source: SendInputSource;
    content: string;
    encoding: "utf8" | "base64";
    contentType: string;
    filePaths?: string[];
    byteLength: number;
};

export const ToolsSend = (config: PacketMcpConfig) => [
    ToolNewThread(config),
    ToolNewMessage(config),
];

const ToolNewThread = ({ keypair, client, config }: PacketMcpConfig) => {
    return defineTool({
        name: "message_new_thread",
        config: {
            title: "Create thread",
            description: "Create a new thread and send the first message",
            inputSchema: sendInputSchema({
                to: z.string().describe("Recipient Solana public key"),
                inbox: z.string().optional().describe("Recipient inbox id or inbox PDA address"),
                thread: z.string().optional().describe("Optional explicit thread id"),
            }),
        },
        cb: async (rawOptions) => {
            const options: any = rawOptions;
            useMcpCrypto(client, keypair);
            const input = await readSendInput(options);
            const to = parsePublicKey(options.to, "to");
            const targetInbox = await resolveTargetInbox({ client, owner: to, inbox: options.inbox });
            const shouldUpload = input.source === "url" ? options.upload === true : options.upload !== false;
            const shouldEncrypt = input.source === "url" && !shouldUpload ? false : options.encrypt !== false;
            const readers = shouldEncrypt ? [await loadReaderForOwner(client, to)] : [];
            const prepared = await prepareMessageContent({
                keypair,
                config,
                client,
                source: input.source,
                content: input.content,
                subject: options.subject,
                raw: options.raw,
                upload: shouldUpload,
                encrypt: shouldEncrypt,
                readers,
                contentType: options.contentType,
                ignoreWarnings: options.ignoreWarnings,
                byteLength: input.byteLength,
                bodyEncoding: input.encoding,
                bodyContentType: input.contentType,
            });
            const manualPayment = targetInbox?.Inbox?.paymentRule ? undefined : buildWsolPayment(options, to);
            const res = await client.createThread({
                to,
                threadId: parseOptionalInteger(options.thread, "thread"),
                targetInbox,
                messageType: prepared.messageType,
                content: prepared.content,
                payment: manualPayment,
                options: txOptions(options),
            });
            const out = sendResultObject({ receipt: res.receipt, thread: res.client.id, input, prepared, payment: manualPayment, paymentTarget: to });
            return textResult(options.json ? jsonText(out) : sendResultText("thread created and message sent", out));
        },
    });
};

const ToolNewMessage = ({ keypair, client, config }: PacketMcpConfig) => {
    return defineTool({
        name: "message_new",
        config: {
            title: "Send message",
            description: "Send a new message to an existing thread",
            inputSchema: sendInputSchema({
                thread: z.string().describe("Existing thread id"),
                disablePayment: z.boolean().optional().describe("Disable payment even if the inbox has a payment rule"),
            }),
        },
        cb: async (rawOptions) => {
            const options: any = rawOptions;
            useMcpCrypto(client, keypair);
            const input = await readSendInput(options);
            const thread = await client.thread(parseOptionalInteger(options.thread, "thread")!).loadRetrying();
            const receiver = getThreadCounterparty(thread, client.walletPublicKey);
            const shouldUpload = input.source === "url" ? options.upload === true : options.upload !== false;
            const shouldEncrypt = input.source === "url" && !shouldUpload ? false : options.encrypt !== false;
            const readers = shouldEncrypt ? [await loadReaderForOwner(client, receiver)] : [];
            const prepared = await prepareMessageContent({
                keypair,
                config,
                client,
                source: input.source,
                content: input.content,
                subject: options.subject,
                raw: options.raw,
                upload: shouldUpload,
                encrypt: shouldEncrypt,
                readers,
                contentType: options.contentType,
                ignoreWarnings: options.ignoreWarnings,
                byteLength: input.byteLength,
                bodyEncoding: input.encoding,
                bodyContentType: input.contentType,
            });
            const payment = buildWsolPayment(options, receiver);
            const res = await thread.sendMessage(
                {
                    messageType: prepared.messageType,
                    content: prepared.content,
                    payment: options.disablePayment ? { disabled: true } : payment,
                },
                txOptions(options)
            );
            const out = sendResultObject({ receipt: res.receipt, thread: thread.id, seq: res.client.msgSeq, input, prepared, payment: options.disablePayment ? undefined : payment, paymentTarget: receiver });
            return textResult(options.json ? jsonText(out) : sendResultText("message sent", out));
        },
    });
};

const sendInputSchema = (extra: Record<string, any>) => {
    return {
        ...extra,
        content: z.string().optional().describe("Inline body or existing pointer"),
        url: z.string().optional().describe("Existing URL/Irys/IPFS/Arweave URL to send as a pointer. This stays a pointer unless upload is explicitly true"),
        text: stringOrStrings.optional().describe("Text/plain Packet envelope part(s)"),
        file: stringOrStrings.optional().describe("File Packet envelope part(s)"),
        subject: z.string().optional().describe("Optional subject for text/file Packet envelope payloads"),
        fileContentType: z.string().optional().describe("Override detected MIME type for file"),
        raw: z.boolean().optional().describe("Send/upload exact content instead of wrapping it in a PacketContent envelope"),
        contentType: z.string().optional().describe("auto, text, url, irys, ipfs, or arweave"),
        upload: z.boolean().optional().describe("Upload content or text/file envelope payload to Irys and send the resulting CID. Defaults to true; set false to send inline or as an existing pointer"),
        encrypt: z.boolean().optional().describe("Encrypt text/envelope/upload payload. Defaults to true; set false to send plaintext. Existing URL/Irys/IPFS/Arweave pointers stay pointers unless upload is used"),
        paymentSol: z.string().optional().describe("Attach a WSOL/SOL payment, e.g. 0.05"),
        paymentTo: z.string().optional().describe("Payment destination owner ATA by default, or raw token account with paymentToRaw"),
        paymentToRaw: z.boolean().optional().describe("Treat paymentTo as a token account address, not an owner"),
        skipPreflight: z.boolean().optional().describe("Skip transaction preflight"),
        priorityFee: z.string().optional().describe("Priority fee in micro lamports"),
        ignoreWarnings: z.boolean().optional().describe("Proceed with sending even if there are warnings"),
        json: z.boolean().optional().describe("Print JSON output"),
    };
};

const readSendInput = async (options: any): Promise<ResolvedSendInput> => {
    const texts = stringList(options.text);
    const files = stringList(options.file);
    const hasEnvelopeParts = texts.length > 0 || files.length > 0;
    const hasContent = options.content != null;
    const hasUrl = options.url != null;
    const inputCount = Number(hasContent) + Number(hasUrl) + Number(hasEnvelopeParts);

    if (inputCount === 0) throw new Error("Missing input. Provide content, url, text, or file");
    if (inputCount > 1) throw new Error("Ambiguous input. Use content, url, or text/file envelope inputs");

    if (hasEnvelopeParts) {
        if (options.raw) throw new Error("raw cannot be combined with text/file envelope inputs");
        const content = await buildMcpPacketEnvelope({
            texts,
            files,
            subject: options.subject,
            fileContentType: options.fileContentType,
        });
        return {
            source: "envelope",
            filePaths: files,
            content,
            encoding: "utf8",
            contentType: "application/json",
            byteLength: Buffer.byteLength(content, "utf8"),
        };
    }

    if (hasUrl) {
        const content = requiredString(options.url, "url");
        return {
            source: "url",
            content,
            encoding: "utf8",
            contentType: "text/plain",
            byteLength: Buffer.byteLength(content, "utf8"),
        };
    }

    const content = requiredString(options.content, "content");
    return {
        source: "content",
        content,
        encoding: "utf8",
        contentType: "text/plain",
        byteLength: Buffer.byteLength(content, "utf8"),
    };
};

const sendResultObject = (params: {
    receipt: any[];
    thread: number;
    seq?: number;
    input: ResolvedSendInput;
    prepared: Awaited<ReturnType<typeof prepareMessageContent>>;
    payment?: any;
    paymentTarget?: any;
}) => {
    return {
        tx: params.receipt,
        thread: params.thread,
        seq: params.seq,
        contentSource: params.input.source,
        files: params.input.filePaths,
        contentType: params.prepared.finalContentType,
        content: params.prepared.content,
        uploaded: params.prepared.uploaded,
        encrypted: params.prepared.encrypted,
        payment: params.payment ? {
            amount: params.payment.amount,
            mint: params.payment.mint,
            to: params.payment.to,
            pretty: formatPayment({ amount: params.payment.amount, mint: params.payment.mint, to: params.paymentTarget ?? params.payment.to }),
        } : null,
    };
};

const sendResultText = (title: string, out: ReturnType<typeof sendResultObject>): string => {
    const lines = [
        title,
        `thread: ${out.thread}`,
    ];
    if (out.seq !== undefined) lines.push(`seq: ${out.seq}`);
    lines.push(`tx: ${out.tx.join(", ")}`);
    lines.push(`content-source: ${out.contentSource}`);
    if (out.files?.length) lines.push(`files: ${out.files.join(", ")}`);
    lines.push(`content-type: ${out.contentType}`);
    lines.push(`content: ${out.content}`);
    if (out.uploaded) lines.push(`uploaded: ${out.uploaded.url}`);
    if (out.encrypted) lines.push("encrypted: yes");
    if (out.payment) lines.push(`payment: ${out.payment.pretty}`);
    return lines.join("\n");
};
