import fs from "node:fs";
import { z } from "zod";
import type { PacketMcpConfig } from "../../config/types.js";
import { readFileAsPayload } from "../../files/index.js";
import { jsonText } from "../../message/format.js";
import { uploadToIrys } from "../../upload/index.js";
import { requiredString } from "../../input/index.js";
import { defineTool } from "../types.js";
import { textResult } from "../message/shared.js";

export const ToolsUpload = (config: PacketMcpConfig) => [
    ToolUploadRaw(config),
    ToolUploadFile(config),
];

const ToolUploadRaw = ({ keypair, config }: PacketMcpConfig) => {
    return defineTool({
        name: "upload_raw",
        config: {
            title: "Upload raw content",
            description: "Upload raw content to Irys",
            inputSchema: {
                content: z.string().describe("Content to upload"),
                contentType: z.string().optional().describe("Content-Type tag"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            const uploaded = await uploadToIrys({
                keypair,
                config,
                payload: requiredString(options.content, "content"),
                contentType: options.contentType ?? "application/json",
                preferFree: true,
            });
            return textResult(options.json ? jsonText(uploaded) : `uploaded: ${uploaded.url}\nid: ${uploaded.id}\nbytes: ${uploaded.bytes}`);
        },
    });
};

const ToolUploadFile = ({ keypair, config }: PacketMcpConfig) => {
    return defineTool({
        name: "upload_file",
        config: {
            title: "Upload file",
            description: "Upload a file to Irys",
            inputSchema: {
                path: z.string().describe("File path"),
                contentType: z.string().optional().describe("Override detected MIME type"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            const payload = await readFileAsPayload(requiredString(options.path, "path"), options.contentType);
            const uploaded = await uploadToIrys({
                keypair,
                config,
                payload: fs.readFileSync(payload.filePath),
                contentType: payload.contentType,
                preferFree: true,
            });
            const out = { ...uploaded, contentType: payload.contentType, path: payload.filePath };
            return textResult(options.json ? jsonText(out) : `uploaded: ${uploaded.url}\nid: ${uploaded.id}\ncontentType: ${payload.contentType}\nbytes: ${uploaded.bytes}`);
        },
    });
};
