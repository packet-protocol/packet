import fs from "node:fs";
import nodePath from "node:path";
import { fileTypeFromFile } from "file-type";
import type { BodyEncoding } from "xpkt-sdk"; 

const EXT_MIME: Record<string, string> = {
  ".json": "application/json",
  ".txt": "text/plain",
  ".html": "text/html",
  ".htm": "text/html",
  ".xml": "application/xml",
  ".csv": "text/csv",
  ".md": "text/markdown",
  ".yaml": "application/yaml",
  ".yml": "application/yaml",
  ".svg": "image/svg+xml",
};

/**
 * Text-ish MIME types are stored as utf8; everything else as base64.
 * SVG is text/xml under the hood, but image/svg+xml -> we still keep it utf8 (it's XML).
 */
export function isTextualMime(mime: string): boolean {
  const m = mime.toLowerCase();
  if (m.startsWith("text/")) return true;
  if (m === "image/svg+xml") return true;
  if (m === "application/json") return true;
  if (m === "application/xml") return true;
  if (m === "application/yaml" || m === "application/x-yaml") return true;
  if (m === "application/javascript" || m === "application/typescript") return true;
  if (m.endsWith("+json") || m.endsWith("+xml")) return true;
  return false;
}

export async function detectMime(path: string, override?: string): Promise<string> {
  if (override) return override;
  const sniffed = (await fileTypeFromFile(path))?.mime;
  if (sniffed) return sniffed;
  const ext = nodePath.extname(path).toLowerCase();
  return EXT_MIME[ext] ?? "application/octet-stream";
}

export type FilePayload = {
  filePath: string;
  contentType: string;
  encoding: BodyEncoding;
  /** utf8-decoded text or base64-encoded bytes, depending on encoding */
  content: string;
  byteLength: number;
};

export async function readFileAsPayload(path: string, overrideContentType?: string): Promise<FilePayload> {
  if (!fs.existsSync(path)) throw new Error(`File not found: ${path}`);
  const stat = fs.statSync(path);
  if (!stat.isFile()) throw new Error(`Path is not a file: ${path}`);

  const contentType = await detectMime(path, overrideContentType);
  const buf = fs.readFileSync(path);

  if (isTextualMime(contentType)) {
    return {
      filePath: path,
      contentType,
      encoding: "utf8",
      content: buf.toString("utf8"),
      byteLength: buf.byteLength,
    };
  }

  return {
    filePath: path,
    contentType,
    encoding: "base64",
    content: buf.toString("base64"),
    byteLength: buf.byteLength,
  };
}