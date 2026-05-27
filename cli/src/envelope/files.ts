import fs from "node:fs/promises";
import path from "node:path";
import { isTextualMime, packetContentBytes, type PacketContent, type ParsedPacketEnvelopeText } from "xpkt-sdk";

export type SavedEnvelopeFile = {
  path: string;
  contentType: string;
  bytes: number;
};

export const saveEnvelopeBinaryParts = async (params: {
  dir?: string;
  payload: ParsedPacketEnvelopeText;
  fileStem: (index: number, part: PacketContent) => string;
}): Promise<SavedEnvelopeFile[]> => {
  if (!params.dir || !params.payload.parts?.length) return [];

  const binaryParts = params.payload.parts.filter((part) => !isTextualMime(part.contentType));
  if (binaryParts.length === 0) return [];

  await fs.mkdir(params.dir, { recursive: true });

  const saved: SavedEnvelopeFile[] = [];
  for (let i = 0; i < binaryParts.length; i++) {
    const part = binaryParts[i]!;
    const bytes = packetContentBytes(part);
    const file = path.join(params.dir, `${params.fileStem(i, part)}${extensionForMime(part.contentType)}`);
    await fs.writeFile(file, bytes);
    saved.push({ path: file, contentType: part.contentType, bytes: bytes.byteLength });
  }

  return saved;
};

export const extensionForMime = (contentType: string): string => {
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
