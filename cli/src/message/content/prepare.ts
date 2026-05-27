import {
  buildPacketEnvelopePayload,
  messageTypeForPacketContent,
  MessageType,
  parsePacketSendContentType,
  resolvePacketSendContent,
} from "xpkt-sdk";
import { uploadToIrys } from "../../upload/irys.js";
import type {
  PreparedMessageContent,
  PrepareContentOptions,
  ResolvedSendContentType,
  SendContentType,
} from "./types.js";

const parseSendContentType = (value: unknown): SendContentType => {
  try {
    return parsePacketSendContentType(value);
  } catch {
    throw new Error("--content-type must be auto, text, url, irys, ipfs, or arweave");
  }
};

export const resolveSendContent = (
  input: string,
  contentType?: string
): {
  type: ResolvedSendContentType;
  content: string;
  source: PreparedMessageContent["source"];
} => {
  try {
    return resolvePacketSendContent(input, contentType);
  } catch (err) {
    if (err instanceof Error && err.message === "content is required") {
      throw new Error("--content is required");
    }
    if (err instanceof Error && err.message === "content type url requires an http(s) URL") {
      throw new Error("--content-type url requires an http(s) URL in --content");
    }
    throw err;
  }
};

export const prepareMessageContent = async (params: PrepareContentOptions): Promise<PreparedMessageContent> => {
  const shouldUpload = params.upload === true;
  const shouldEncrypt = params.encrypt === true;

  if (shouldUpload) {
    return prepareUploadedContent(params, shouldEncrypt);
  }

  if (params.source === "envelope") {
    assertInlineSize(params.byteLength, params.ignoreWarnings);
    const content = shouldEncrypt ? await encryptPayload(params, params.content, false) : params.content;
    return {
      messageType: MessageType.Text,
      content,
      finalContentType: "text",
      encrypted: shouldEncrypt,
      source: "envelope",
    };
  }

  const resolved = resolveSendContent(params.content, params.contentType);
  if (resolved.type !== "text") {
    return {
      messageType: messageTypeForPacketContent(resolved.type),
      content: resolved.content,
      finalContentType: resolved.type,
      encrypted: false,
      source: resolved.source,
    };
  }

  if (params.source !== "url") {
    assertInlineSize(params.byteLength, params.ignoreWarnings);
  }

  const plaintext = buildPacketEnvelopePayload({
    content: resolved.content,
    subject: params.subject,
    raw: params.raw,
    contentType: params.bodyContentType ?? "text/plain",
    encoding: params.bodyEncoding ?? "utf8",
  });
  const content = shouldEncrypt ? await encryptPayload(params, plaintext, false) : plaintext;

  return {
    messageType: MessageType.Text,
    content,
    finalContentType: "text",
    encrypted: shouldEncrypt,
    source: "text",
  };
};

const encryptPayload = async (params: PrepareContentOptions, plaintext: string, asJson: boolean): Promise<string> => {
  const body = await params.client.crypto.encrypt({
    plaintext,
    readers: params.readers ?? [],
    includeSelf: true,
  });

  return asJson ? params.client.crypto.toJson(body) : params.client.crypto.toContent(body);
};

const assertInlineSize = (byteLength?: number, ignoreWarnings?: boolean): void => {
  if (ignoreWarnings === true) return;
  if (byteLength === undefined || byteLength <= 256) return;
  throw new Error(
    "Content too large for inline message body. Consider using --upload to upload the content to Irys and send a pointer instead. Pass --ignore-warnings to proceed with sending anyway."
  );
};

const prepareUploadedContent = async (
  params: PrepareContentOptions,
  shouldEncrypt: boolean
): Promise<PreparedMessageContent> => {
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

  const plaintext = params.source === "envelope"
    ? params.content
    : buildPacketEnvelopePayload({
        content: params.content,
        subject: params.subject,
        raw: params.raw,
        contentType: params.bodyContentType ?? "text/plain",
        encoding: params.bodyEncoding ?? "utf8",
      });
  const payload = shouldEncrypt ? await encryptPayload(params, plaintext, true) : plaintext;
  const isBareString = params.source !== "envelope" && params.raw === true && !params.subject;

  const uploaded = await uploadToIrys({
    keypair: params.keypair,
    config: params.config,
    payload,
    contentType: shouldEncrypt || params.source === "envelope" || !isBareString ? "application/json" : "text/plain",
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
};
