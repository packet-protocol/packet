import { PacketEnvelope, type PacketContent } from "xpkt-sdk";
import { readFileAsPayload } from "../files/index.js";

export type BuiltCliEnvelope = {
  plaintext: string;
  parts: PacketContent[];
  byteLength: number;
};

export const buildCliPacketEnvelope = async (params: {
  texts: string[];
  files: string[];
  subject?: string;
  fileContentType?: string;
}): Promise<BuiltCliEnvelope> => {
  const parts: PacketContent[] = [];
  if (params.fileContentType && params.files.length !== 1) {
    throw new Error("--file-content-type can only be used with exactly one --file");
  }

  for (const value of params.texts) {
    parts.push({ contentType: "text/plain", encoding: "utf8", content: value });
  }

  for (const file of params.files) {
    const payload = await readFileAsPayload(file, params.fileContentType);
    parts.push({
      contentType: payload.contentType,
      encoding: payload.encoding,
      content: payload.content,
    });
  }

  if (parts.length === 0) throw new Error("Packet envelope needs at least one --text or --file");

  const envelope = new PacketEnvelope();
  if (parts.length === 1 && !params.subject) {
    const plaintext = envelope.content(parts[0]!).encode();
    return { plaintext, parts, byteLength: new TextEncoder().encode(plaintext).byteLength };
  }

  envelope.mail(params.subject);
  for (const part of parts) envelope.content(part);
  const plaintext = envelope.encode();
  return { plaintext, parts, byteLength: new TextEncoder().encode(plaintext).byteLength };
};
