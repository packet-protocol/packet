import { z } from "zod";
import { defineTool } from "../types.js";
import fs from "fs";
import { requiredString } from "../../input/index.js";
import type { PacketMcpConfig } from "../../config/types.js";
import {
    AsymmetricEncryptionAlgorithm,
    isTextualMime,
    PacketEncryptionClient,
    packetContentBytes,
    parsePacketEnvelopeText,
    type PacketContent,
} from "xpkt-sdk";
import { PublicKey } from "@solana/web3.js";
import { uploadToIrys } from "../../upload/index.js";
import { buildMcpPacketEnvelope, stringList } from "../../envelope/index.js";

const stringOrStrings = z.union([z.string(), z.array(z.string())]);

export const ToolsCrypto = (config: PacketMcpConfig) => {

    return [
        ToolEncrypt(config),
        ToolDecrypt(config),
    ]

}

const ToolEncrypt = ({ keypair, client, config }: PacketMcpConfig) => {
    return defineTool({
        name: "crypto_encrypt",
        config: {
            title: "Encrypt",
            description: "Encrypt content for a specific reader",
            inputSchema: {
                to: z.string().describe("Target Solana wallet"),
                content: z.string().optional().describe("Exact plaintext to encrypt. Cannot be combined with text/file"),
                text: stringOrStrings.optional().describe("Text/plain Packet envelope part(s)"),
                file: stringOrStrings.optional().describe("File Packet envelope part(s)"),
                subject: z.string().optional().describe("Optional Packet envelope subject"),
                fileContentType: z.string().optional().describe("Override detected MIME type. Valid with exactly one file"),
                dontIncludeSender: z.boolean().optional().describe("Exclude sender from readers"),
                out: z.string().optional().describe("Output file path"),
                upload: z.boolean().optional().describe("Upload encrypted content to Irys"),
            },
        },
        cb: async (options) => {

            const texts = stringList(options.text);
            const files = stringList(options.file);
            const hasContent = options.content != null;
            const hasEnvelopeParts = texts.length > 0 || files.length > 0;

            if (hasContent && hasEnvelopeParts) {
                throw new Error("Ambiguous input. Use content for exact plaintext, or text/file for a Packet envelope");
            } else if (!hasContent && !hasEnvelopeParts) {
                throw new Error("Missing input. Provide content, text, or file");
            }

            const plaintext = hasContent
                ? requiredString(options.content, "content")
                : await buildMcpPacketEnvelope({
                    texts,
                    files,
                    subject: options.subject,
                    fileContentType: options.fileContentType,
                });

            client.useCrypto(new PacketEncryptionClient().useSolanaKeypair(keypair).requireIdentity());

            const targetPubkey = new PublicKey(options.to);
            const targetReader = new PacketEncryptionClient().reader({
                ownerWallet: options.to,
                keyAlg: AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519,
                publicKey: targetPubkey.toBytes(),
            });

            const body = await client.crypto.encrypt({
                plaintext,
                readers: [targetReader],
                includeSelf: options.dontIncludeSender !== true,
            });

            const json = client.crypto.toJson(body);

            if (options.out) {
                fs.writeFileSync(options.out, json, "utf-8");
                return {
                    content: [
                        {
                            type: "text",
                            text: `saved: ${options.out}`,
                        },
                    ],
                };
            }

            if (options.upload) {
                const uploaded = await uploadToIrys({ keypair, config, payload: json, contentType: "application/json", preferFree: true });
                return {
                    content: [
                        {
                            type: "text",
                            text: `uploaded: ${uploaded.url}`,
                        },
                    ],
                }
            }

            if (!options.out && !options.upload) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(body, null, 2),
                        },
                    ],
                };
            }
        },
    });
}

export const ToolDecrypt = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "crypto_decrypt",
        config: {
            title: "Decrypt",
            description: "Decrypt Packet encrypted content from text, file, or URL",
            inputSchema: {
                text: z.string().optional().describe("Encrypted text / JSON body"),
                file: z.string().optional().describe("File containing encrypted content"),
                url: z.string().optional().describe("URL containing encrypted content"),
                json: z.boolean().optional().describe("Print JSON result"),
            },
        },
        cb: async (options) => {
            client.useCrypto(new PacketEncryptionClient().useSolanaKeypair(keypair).requireIdentity());

            const raw = await readCryptoInput(options);
            let plaintext: string;
            let encrypted = true;

            try {
                const maybe = await client.crypto.maybeDecrypt(raw);
                plaintext = maybe.plaintext;
                encrypted = maybe.encrypted;
            } catch {
                const body = client.crypto.fromJson(raw);
                plaintext = await client.crypto.decrypt({ body });
            }

            const parsed = parsePacketEnvelopeText(plaintext);
            const resourceBlocks = packetContentResources(parsed.parts);

            return {
                content: [
                    {
                        type: "text",
                        text: options.json
                            ? JSON.stringify({
                                encrypted,
                                plaintext,
                                packet: {
                                    subject: parsed.subject,
                                    message: parsed.message,
                                    contentType: parsed.contentType,
                                    encoding: parsed.encoding,
                                    parts: parsed.parts?.map((part) => ({
                                        contentType: part.contentType,
                                        encoding: part.encoding,
                                        preview: isTextualMime(part.contentType)
                                            ? part.content
                                            : `[binary ${part.contentType}, ${packetContentBytes(part).byteLength} bytes]`,
                                    })),
                                },
                            }, null, 2)
                            : `${parsed.subject ? `subject: ${parsed.subject}\n` : ""}${parsed.message}`,
                    },
                    ...resourceBlocks,
                ],
            };
        }
    });
}

/**
 * Read encrypted content from one of text, file, or URL.
 *
 * Validates that exactly one of the options is provided, and throws an error if not.
 */
const readCryptoInput = async (options: { text?: string; file?: string; url?: string }): Promise<string> => {
    const count = [options.text, options.file, options.url].filter(Boolean).length;
    if (count !== 1) throw new Error("Provide exactly one of --text, --file, or --url");
    if (options.text) return options.text;
    if (options.file) return fs.readFileSync(options.file, "utf-8");
    const res = await fetch(options.url!);
    if (!res.ok) throw new Error(`Failed to fetch ${options.url}: HTTP ${res.status}`);
    return await res.text();
};

const packetContentResources = (parts: PacketContent[] | undefined) => {
    if (!parts) return [];

    return parts
        .filter((part) => !isTextualMime(part.contentType))
        .map((part, index) => {
            const bytes = packetContentBytes(part);
            return {
                type: "resource" as const,
                resource: {
                    uri: `packet://envelope/part-${index + 1}${extensionForMime(part.contentType)}`,
                    mimeType: part.contentType,
                    blob: Buffer.from(bytes).toString("base64"),
                },
            };
        });
};

const extensionForMime = (contentType: string): string => {
    const mime = contentType.split(";")[0]!.trim().toLowerCase();
    switch (mime) {
        case "image/png":
            return ".png";
        case "image/jpeg":
            return ".jpg";
        case "image/gif":
            return ".gif";
        case "image/webp":
            return ".webp";
        case "application/pdf":
            return ".pdf";
        case "application/zip":
            return ".zip";
        default:
            return ".bin";
    }
};
