import { text, utf8 } from "../../utils/encoding";
import { isTextualMime, parsePacketEnvelopeText, type ParsedPacketEnvelopeText } from "../envelope";
import { MessageType } from "./types";

export const PACKET_IRYS_GATEWAY = "https://gateway.irys.xyz";
export const PACKET_IPFS_GATEWAY = "https://ipfs.io/ipfs";
export const PACKET_ARWEAVE_GATEWAY = "https://arweave.net";

export type PacketSendContentType = "auto" | PacketMessageContentKind;
export type PacketMessageContentKind = "text" | "url" | "irys" | "ipfs" | "arweave";
export type PacketMessageContentSource =
    | "text"
    | "url"
    | "irys-url"
    | "irys-cid"
    | "ipfs-uri"
    | "ipfs-url"
    | "ipfs-cid"
    | "arweave-uri"
    | "arweave-url"
    | "arweave-id";

export type PacketResolvedContent = {
    type: PacketMessageContentKind;
    content: string;
    source: PacketMessageContentSource;
};

export type PacketLoadedContent = {
    kind: "inline" | "url";
    bytes: Uint8Array;
    text?: string;
    contentType?: string;
    url?: string;
    messageContentKind: PacketMessageContentKind;
};

export type ParsedPacketMessageContent = ParsedPacketEnvelopeText & {
    rawText?: string;
    rawBytes: Uint8Array;
    loadedContentType?: string;
    loadedUrl?: string;
    encrypted: boolean;
    mediaKind: "text" | "binary";
};

const URL_RE = /^https?:\/\//i;
const IRYS_URL_RE = /^https?:\/\/(?:gateway\.)?irys\.xyz\/([^\s/?#]+)/i;
const IPFS_URI_RE = /^ipfs:\/\/([^\s/?#]+)/i;
const IPFS_GATEWAY_RE = /^https?:\/\/[^/]+\/ipfs\/([^\s/?#]+)/i;
const ARWEAVE_URI_RE = /^ar:\/\/([^\s/?#]+)/i;
const ARWEAVE_GATEWAY_RE = /^https?:\/\/(?:[^/]+\.)?arweave\.net\/([^\s/?#]+)/i;

export function parsePacketSendContentType(value: unknown): PacketSendContentType {
    const v = String(value ?? "auto").trim().toLowerCase();
    if (v === "" || v === "auto") return "auto";
    if (v === "text" || v === "url" || v === "irys" || v === "ipfs" || v === "arweave") return v;
    throw new Error("content type must be auto, text, url, irys, ipfs, or arweave");
}

export function messageTypeForPacketContent(type: PacketMessageContentKind): MessageType {
    switch (type) {
        case "text":
            return MessageType.Text;
        case "url":
            return MessageType.Url;
        case "ipfs":
            return MessageType.Ipfs;
        case "irys":
            return MessageType.Irys;
        case "arweave":
            return MessageType.Arweave;
    }
}

export function packetContentKindForMessageType(messageType: MessageType | number | undefined): PacketMessageContentKind | undefined {
    switch (messageType) {
        case MessageType.Text:
            return "text";
        case MessageType.Url:
            return "url";
        case MessageType.Ipfs:
            return "ipfs";
        case MessageType.Irys:
            return "irys";
        case MessageType.Arweave:
            return "arweave";
        default:
            return undefined;
    }
}

export function packetMessageTypeName(messageType: MessageType | number | undefined): string {
    return packetContentKindForMessageType(messageType) ?? `custom:${String(messageType ?? "unknown")}`;
}

export function extractPacketIrysId(input: string): string | null {
    return input.trim().match(IRYS_URL_RE)?.[1] ?? null;
}

export function extractPacketIpfsCid(input: string): { cid: string; from: "uri" | "url" } | null {
    const raw = input.trim();
    const uri = raw.match(IPFS_URI_RE);
    if (uri) return { cid: uri[1]!, from: "uri" };
    const url = raw.match(IPFS_GATEWAY_RE);
    if (url) return { cid: url[1]!, from: "url" };
    return null;
}

export function extractPacketArweaveId(input: string): { id: string; from: "uri" | "url" } | null {
    const raw = input.trim();
    const uri = raw.match(ARWEAVE_URI_RE);
    if (uri) return { id: uri[1]!, from: "uri" };
    const url = raw.match(ARWEAVE_GATEWAY_RE);
    if (url) return { id: url[1]!, from: "url" };
    return null;
}

export function isPacketHttpUrl(input: string): boolean {
    const raw = input.trim();
    if (!URL_RE.test(raw)) return false;
    try {
        new URL(raw);
        return true;
    } catch {
        return false;
    }
}

export function resolvePacketSendContent(input: string, contentType?: string): PacketResolvedContent {
    const raw = input.trim();
    if (!raw) throw new Error("content is required");

    const explicit = parsePacketSendContentType(contentType);
    if (explicit === "text") return { type: "text", content: raw, source: "text" };

    if (explicit === "url") {
        if (!isPacketHttpUrl(raw)) throw new Error("content type url requires an http(s) URL");
        return { type: "url", content: raw, source: "url" };
    }

    if (explicit === "irys") {
        const id = extractPacketIrysId(raw);
        return { type: "irys", content: id ?? raw, source: id ? "irys-url" : "irys-cid" };
    }

    if (explicit === "ipfs") {
        const found = extractPacketIpfsCid(raw);
        return {
            type: "ipfs",
            content: found?.cid ?? raw,
            source: found ? (found.from === "uri" ? "ipfs-uri" : "ipfs-url") : "ipfs-cid",
        };
    }

    if (explicit === "arweave") {
        const found = extractPacketArweaveId(raw);
        return {
            type: "arweave",
            content: found?.id ?? raw,
            source: found ? (found.from === "uri" ? "arweave-uri" : "arweave-url") : "arweave-id",
        };
    }

    const ipfs = extractPacketIpfsCid(raw);
    if (ipfs) return { type: "ipfs", content: ipfs.cid, source: ipfs.from === "uri" ? "ipfs-uri" : "ipfs-url" };

    const arweave = extractPacketArweaveId(raw);
    if (arweave) return { type: "arweave", content: arweave.id, source: arweave.from === "uri" ? "arweave-uri" : "arweave-url" };

    const irysId = extractPacketIrysId(raw);
    if (irysId) return { type: "irys", content: irysId, source: "irys-url" };

    if (isPacketHttpUrl(raw)) return { type: "url", content: raw, source: "url" };

    return { type: "text", content: raw, source: "text" };
}

export function appendPacketGatewayIfNeeded(messageType: MessageType | number | undefined, rawContent: string): string {
    const raw = rawContent.trim();
    if (!raw) return raw;
    if (URL_RE.test(raw) || /^ipfs:\/\//i.test(raw) || /^ar:\/\//i.test(raw)) return raw;

    switch (messageType) {
        case MessageType.Irys:
            return `${PACKET_IRYS_GATEWAY}/${raw}`;
        case MessageType.Ipfs:
            return `${PACKET_IPFS_GATEWAY}/${raw}`;
        case MessageType.Arweave:
            return `${PACKET_ARWEAVE_GATEWAY}/${raw}`;
        default:
            return raw;
    }
}

export async function loadPacketMessageContent(params: {
    messageType: MessageType | number;
    content: Uint8Array | string;
    fetchFn?: typeof fetch;
}): Promise<PacketLoadedContent> {
    const messageContentKind = packetContentKindForMessageType(params.messageType);
    if (!messageContentKind) throw new Error(`Unsupported message type: ${params.messageType}`);

    const rawContent = typeof params.content === "string" ? params.content : text(params.content);

    if (messageContentKind === "text") {
        return {
            kind: "inline",
            bytes: typeof params.content === "string" ? utf8(params.content) : params.content,
            text: rawContent,
            contentType: "text/plain",
            messageContentKind,
        };
    }

    const url = appendPacketGatewayIfNeeded(params.messageType, rawContent);
    const fetchImpl = params.fetchFn ?? fetch;
    const res = await fetchImpl(url);

    if (!res.ok) throw new Error(`Failed to load message content: ${res.status}`);

    const bytes = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("Content-Type") || undefined;
    return {
        kind: "url",
        bytes,
        text: isLoadedContentText(contentType) ? new TextDecoder().decode(bytes) : undefined,
        contentType,
        url,
        messageContentKind,
    };
}

export function parseLoadedPacketMessageContent(params: {
    loaded: PacketLoadedContent;
    plaintext: string;
    encrypted: boolean;
}): ParsedPacketMessageContent {
    const parsed = parsePacketEnvelopeText(params.plaintext);
    const hasBinaryPart = parsed.parts?.some((part) => !isTextualMime(part.contentType)) ?? false;

    return {
        ...parsed,
        rawText: params.loaded.text,
        rawBytes: params.loaded.bytes,
        loadedContentType: params.loaded.contentType,
        loadedUrl: params.loaded.url,
        encrypted: params.encrypted,
        mediaKind: hasBinaryPart || !isLoadedContentText(params.loaded.contentType) ? "binary" : "text",
    };
}

function isLoadedContentText(contentType: string | undefined): boolean {
    return !contentType || isTextualMime(contentType);
}
