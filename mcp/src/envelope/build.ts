import { PacketEnvelope, type PacketContent } from "xpkt-sdk";
import { readFileAsPayload } from "../files/index.js";

export const buildMcpPacketEnvelope = async (params: {
  texts: string[];
  files: string[];
  subject?: string;
  fileContentType?: string;
}): Promise<string> => {
  if (params.fileContentType && params.files.length !== 1) {
    throw new Error("fileContentType can only be used with exactly one file");
  }

  const parts: PacketContent[] = [];

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

  if (parts.length === 0) throw new Error("Packet envelope needs at least one text or file");

  const envelope = new PacketEnvelope();
  if (parts.length === 1 && !params.subject) return envelope.content(parts[0]!).encode();

  envelope.mail(params.subject);
  for (const part of parts) envelope.content(part);
  return envelope.encode();
};
