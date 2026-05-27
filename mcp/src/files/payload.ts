import fs from "node:fs";
import { isTextualMime, type BodyEncoding } from "xpkt-sdk";
import { detectMime } from "./mime.js";

export type FilePayload = {
  filePath: string;
  contentType: string;
  encoding: BodyEncoding;
  content: string;
  byteLength: number;
};

export const readFileAsPayload = async (path: string, overrideContentType?: string): Promise<FilePayload> => {
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
};
