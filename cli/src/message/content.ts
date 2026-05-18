import type { Keypair } from "@solana/web3.js";
import { type BodyEncoding, MessageType, type PacketClient, type PacketContent, PacketEnvelope } from "xpkt-sdk";
import { uploadToIrys, IRYS_GATEWAY } from "../upload/irys.js";
import type { PacketCliConfig } from "../config/types.js";
import type { SendInputSource } from "./send.js";
import { isTextualMime } from "../helpers/file.js";

export type SendContentType = "auto" | "text" | "url" | "irys" | "ipfs" | "arweave";
export type ResolvedSendContentType = Exclude<SendContentType, "auto">;

export type PrepareContentOptions = {
  keypair: Keypair;
  config: PacketCliConfig["config"];
  client: PacketClient;
  source: SendInputSource;
  content: string;
  subject?: string;
  raw?: boolean;

  /**
   * Default false.
   * If true:
   * - with upload: encrypts payload JSON and uploads it to Irys
   * - without upload: sends inline encrypted Packet content as MessageType.Text
   */
  encrypt?: boolean;

  /**
   * Default false.
   * If true, uploads the prepared payload to Irys and sends the Irys CID as MessageType.Irys.
   * Upload is only supported for Irys.
   */
  upload?: boolean;

  readers?: any[];

  /**
   * auto: detects irys/ipfs/arweave/url/text from input.
   * irys:    accepts Irys gateway URL or raw CID, stores only the CID.
   * ipfs:    accepts ipfs:// URI, IPFS gateway URL, or raw CID, stores only the CID.
   * arweave: accepts ar:// URI, arweave.net URL, or raw tx id, stores only the id.
   * url:     accepts a normal http(s) URL and stores the full URL.
   * text:    stores as plain/inline text.
   */
  contentType?: string;
  ignoreWarnings?: boolean;
  /** BodyEncoding for the inline content (utf8 for text/url, utf8 or base64 for files). */
  bodyEncoding?: BodyEncoding;
  /** MIME type for the inline content (e.g. "text/plain", "image/png"). */
  bodyContentType?: string;
  /** Byte length for the inline content. */
  byteLength?: number;
};

export type PreparedMessageContent = {
  messageType: MessageType;
  content: string;
  finalContentType: ResolvedSendContentType;
  uploaded?: { id: string; url: string; bytes: number; usedFreeWallet: boolean };
  encrypted: boolean;
  source:
  | "text"
  | "url"
  | "irys-url"
  | "irys-cid"
  | "uploaded-irys"
  | "ipfs-uri"
  | "ipfs-url"
  | "ipfs-cid"
  | "arweave-uri"
  | "arweave-url"
  | "arweave-id";
};

// Detection patterns 

const URL_RE = /^https?:\/\//i;

// Irys gateway: https://gateway.irys.xyz/<id> or https://irys.xyz/<id>
const IRYS_URL_RE = /^https?:\/\/(?:gateway\.)?irys\.xyz\/([^\s/?#]+)/i;

// Arweave gateway: https://arweave.net/<txid> (also accepts subdomains like https://<id>.arweave.net)
const ARWEAVE_GATEWAY_RE = /^https?:\/\/(?:[^/]+\.)?arweave\.net\/([^\s/?#]+)/i;
const ARWEAVE_URI_RE = /^ar:\/\/([^\s/?#]+)/i;

// IPFS: ipfs://<cid>[/...]  or  https://<host>/ipfs/<cid>[/...]
const IPFS_URI_RE = /^ipfs:\/\/([^\s/?#]+)/i;
const IPFS_GATEWAY_RE = /^https?:\/\/[^/]+\/ipfs\/([^\s/?#]+)/i;

// Pure helpers

function parseSendContentType(value: unknown): SendContentType {
  const v = String(value ?? "auto").trim().toLowerCase();
  if (v === "" || v === "auto") return "auto";
  if (v === "text" || v === "url" || v === "irys" || v === "ipfs" || v === "arweave") return v;
  throw new Error("--content-type must be auto, text, url, irys, ipfs, or arweave");
}

function messageTypeFor(type: ResolvedSendContentType): MessageType {
  switch (type) {
    case "text":
      return MessageType.Text;
    case "url":
      return MessageType.Url;
    case "irys":
      return MessageType.Irys;
    case "ipfs":
      return MessageType.Ipfs;
    case "arweave":
      return MessageType.Arweave;
    default:
      throw new Error(`Unsupported content type: ${type}`);
  }
}

export function extractIrysId(input: string): string | null {
  return input.trim().match(IRYS_URL_RE)?.[1] ?? null;
}

export function extractIpfsCid(input: string): { cid: string; from: "uri" | "url" } | null {
  const raw = input.trim();
  const uri = raw.match(IPFS_URI_RE);
  if (uri) return { cid: uri[1]!, from: "uri" };
  const url = raw.match(IPFS_GATEWAY_RE);
  if (url) return { cid: url[1]!, from: "url" };
  return null;
}

export function extractArweaveId(input: string): { id: string; from: "uri" | "url" } | null {
  const raw = input.trim();
  const uri = raw.match(ARWEAVE_URI_RE);
  if (uri) return { id: uri[1]!, from: "uri" };
  const url = raw.match(ARWEAVE_GATEWAY_RE);
  if (url) return { id: url[1]!, from: "url" };
  return null;
}

export function isHttpUrl(input: string): boolean {
  const raw = input.trim();
  if (!URL_RE.test(raw)) return false;
  try {
    new URL(raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds the wire payload
*/
export function buildEnvelopePayload(
  content: string,
  subject: string | undefined,
  raw: boolean | undefined,
  contentType: string,
  encoding: BodyEncoding,
): string {
  const envelope = new PacketEnvelope();

  // --raw with no subject AND text body: send as bare string. Binary -> always envelope.
  if (raw && !subject && encoding === "utf8" && contentType === "text/plain") {
    return envelope.text(content).encode();
  }

  const part: PacketContent = { contentType, encoding, content };

  if (subject) return envelope.mail(subject).content(part).encode();
  return envelope.content(part).encode();
}

// Content type resolution

/**
 * Resolves a user-provided input into a concrete content type + the value to store on-chain.
 * Pointers (irys/ipfs/arweave/url) are normalized: gateway URLs and URI schemes are reduced
 * to bare CIDs/IDs where the MessageType implies the scheme.
 */
export function resolveSendContent(
  input: string,
  contentType?: string
): {
  type: ResolvedSendContentType;
  content: string;
  source: PreparedMessageContent["source"];
} {
  const raw = input.trim();
  if (!raw) throw new Error("--content is required");

  const explicit = parseSendContentType(contentType);

  if (explicit === "text") {
    return { type: "text", content: raw, source: "text" };
  }

  if (explicit === "url") {
    if (!isHttpUrl(raw)) throw new Error("--content-type url requires an http(s) URL in --content");
    return { type: "url", content: raw, source: "url" };
  }

  if (explicit === "irys") {
    const id = extractIrysId(raw);
    return {
      type: "irys",
      content: id ?? raw,
      source: id ? "irys-url" : "irys-cid",
    };
  }

  if (explicit === "ipfs") {
    const found = extractIpfsCid(raw);
    return {
      type: "ipfs",
      content: found?.cid ?? raw,
      source: found ? (found.from === "uri" ? "ipfs-uri" : "ipfs-url") : "ipfs-cid",
    };
  }

  if (explicit === "arweave") {
    const found = extractArweaveId(raw);
    return {
      type: "arweave",
      content: found?.id ?? raw,
      source: found ? (found.from === "uri" ? "arweave-uri" : "arweave-url") : "arweave-id",
    };
  }

  // auto-detect: check specific schemes first, then generic URL, then text.
  const ipfs = extractIpfsCid(raw);
  if (ipfs) {
    return {
      type: "ipfs",
      content: ipfs.cid,
      source: ipfs.from === "uri" ? "ipfs-uri" : "ipfs-url",
    };
  }

  const arweave = extractArweaveId(raw);
  if (arweave) {
    return {
      type: "arweave",
      content: arweave.id,
      source: arweave.from === "uri" ? "arweave-uri" : "arweave-url",
    };
  }

  const irysId = extractIrysId(raw);
  if (irysId) {
    return { type: "irys", content: irysId, source: "irys-url" };
  }

  if (isHttpUrl(raw)) {
    return { type: "url", content: raw, source: "url" };
  }

  return { type: "text", content: raw, source: "text" };
}

// Encryption 

async function encryptPayload(params: PrepareContentOptions, plaintext: string, asJson: boolean): Promise<string> {
  const body = await params.client.crypto.encrypt({
    plaintext,
    readers: params.readers ?? [],
    includeSelf: true,
  });

  return asJson ? params.client.crypto.toJson(body) : params.client.crypto.toContent(body);
}

// Main entry point 

/**
 * Prepares a message for sending. Three top-level branches:
 *  1. --upload: build payload, optionally encrypt, upload to Irys, send Irys CID. (Irys only.)
 *  2. Input resolves to a pointer (irys/ipfs/arweave/url): send pointer as-is.
 *  3. Input is text: optionally encrypt inline, send as MessageType.Text.
 */
export async function prepareMessageContent(params: PrepareContentOptions): Promise<PreparedMessageContent> {
  const shouldUpload = params.upload === true;
  const shouldEncrypt = params.encrypt === true;

  // 1. Upload path (Irys only).
  if (shouldUpload) {
    return prepareUploadedContent(params, shouldEncrypt);
  }

  const resolved = resolveSendContent(params.content, params.contentType);

  // 2. Pointer path. Encryption here would encrypt only the pointer, not the target.
  //    For encrypted external payloads, use: --upload --encrypt.
  if (resolved.type !== "text") {
    return {
      messageType: messageTypeFor(resolved.type),
      content: resolved.content,
      finalContentType: resolved.type,
      encrypted: false,
      source: resolved.source,
    };
  }

  // 3. Inline text path.
  if (params.source !== "url") {
    assertInlineSize(params.byteLength, params.ignoreWarnings);
  }

  const plaintext = buildEnvelopePayload(
    resolved.content,
    params.subject,
    params.raw,
    params.bodyContentType ?? "text/plain",
    params.bodyEncoding ?? "utf8",
  );
  const content = shouldEncrypt ? await encryptPayload(params, plaintext, false) : plaintext;

  return {
    messageType: MessageType.Text,
    content,
    finalContentType: "text",
    encrypted: shouldEncrypt,
    source: "text",
  };
}

function assertInlineSize(byteLength?: number, ignoreWarnings?: boolean): void {
  if (ignoreWarnings === true) return;
  if (byteLength === undefined || byteLength <= 256) return;
  throw new Error(
    "Content too large for inline message body. Consider using --upload to upload the content to Irys and send a pointer instead. Pass --ignore-warnings to proceed with sending anyway."
  );
}

async function prepareUploadedContent(
  params: PrepareContentOptions,
  shouldEncrypt: boolean
): Promise<PreparedMessageContent> {
  // Upload is only supported for Irys. Reject explicit conflicting --content-type early.
  const explicit = parseSendContentType(params.contentType);
  if (explicit !== "auto" && explicit !== "irys" && explicit !== "text") {
    throw new Error(
      `--upload is only supported for Irys (--content-type=irys or text). Got --content-type=${explicit}.`
    );
  }

  if (params.source === "url" && params.ignoreWarnings !== true) {
    throw new Error(
      "Cannot upload content from URL source. Please fetch the content and provide it as text or file input. Pass --ignore-warnings to proceed with sending anyway."
    );
  }


  const plaintext = buildEnvelopePayload(
    params.content,
    params.subject,
    params.raw,
    params.bodyContentType ?? "text/plain",
    params.bodyEncoding ?? "utf8",
  );
  const payload = shouldEncrypt ? await encryptPayload(params, plaintext, true) : plaintext;
  const isBareString = params.raw === true && !params.subject;

  const uploaded = await uploadToIrys({
    keypair: params.keypair,
    config: params.config,
    payload,
    contentType: shouldEncrypt || !isBareString ? "application/json" : "text/plain",
    preferFree: true,
  });

  return {
    messageType: MessageType.Irys,
    content: uploaded.id,
    finalContentType: "irys",
    uploaded,
    encrypted: shouldEncrypt,
    source: "uploaded-irys",
  };
}

// Reading / display

export async function loadMessageRawText(message: any): Promise<string> {
  const loaded = await message.loadContent();
  return loaded.text ?? new TextDecoder().decode(loaded.bytes);
}

export function rawMessageContentText(message: any): string {
  const content = message?.Message?.content ?? message?.content;
  if (!content) return "";
  if (typeof content === "string") return content;
  return new TextDecoder().decode(content instanceof Uint8Array ? content : new Uint8Array(content));
}

export function messageTypeName(messageType: MessageType | number | undefined): string {
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
      return `custom:${String(messageType ?? "unknown")}`;
  }
}

export function appendGatewayIfNeeded(messageType: MessageType | number | undefined, rawContent: string): string {
  const raw = rawContent.trim();
  if (!raw) return raw;
  if (URL_RE.test(raw) || /^ipfs:\/\//i.test(raw) || /^ar:\/\//i.test(raw)) return raw;

  switch (messageType) {
    case MessageType.Irys:
      return `${IRYS_GATEWAY}/${raw}`;
    case MessageType.Arweave:
      return `https://arweave.net/${raw}`;
    case MessageType.Ipfs:
      return `ipfs://${raw}`;
    default:
      return raw;
  }
}

export function rawMessageDisplay(message: any): {
  raw: string;
  display: string;
  messageType: string;
  isPointer: boolean;
} {
  const msg = message?.Message ?? message;
  const raw = rawMessageContentText(message);
  const display = appendGatewayIfNeeded(msg?.messageType, raw);
  const type = messageTypeName(msg?.messageType);

  return {
    raw,
    display,
    messageType: type,
    isPointer: type === "url" || type === "irys" || type === "arweave" || type === "ipfs",
  };
}

export function parsePacketEnvelopeText(plaintext: string): {
  subject?: string;
  message: string;
  envelope: ReturnType<typeof PacketEnvelope.decode>;
} {
  let envelope: ReturnType<typeof PacketEnvelope.decode>;
  try {
    envelope = PacketEnvelope.decode(plaintext);
  } catch {
    return { message: plaintext, envelope: plaintext };
  }

  // bare string
  if (typeof envelope === "string") {
    return { message: envelope, envelope };
  }

  // PacketMail: has `message` field
  if ("message" in envelope) {
    const msg = envelope.message;

    if (typeof msg === "string") {
      return { subject: envelope.subject, message: msg, envelope };
    }

    const body = Array.isArray(msg)
      ? msg.map(renderPacketContent).join("\n\n")
      : renderPacketContent(msg);
    return {
      subject: envelope.subject,
      message: body,
      envelope,
    };
  }

  // PacketContent
  return { message: renderPacketContent(envelope), envelope };
}

function renderPacketContent(part: PacketContent): string {
  if (part.encoding === "utf8") return part.content;
  // base64. Only decode to text if the MIME is textual; otherwise show a placeholder.
  if (isTextualMime(part.contentType)) {
    try { return Buffer.from(part.content, "base64").toString("utf8"); }
    catch { return part.content; }
  }
  const sizeKb = Math.round((part.content.length * 3) / 4 / 1024);
  return `[binary ${part.contentType}, ~${sizeKb} KB base64]`;
}