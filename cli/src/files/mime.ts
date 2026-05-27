import nodePath from "node:path";
import { fileTypeFromFile } from "file-type";

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

export const detectMime = async (path: string, override?: string): Promise<string> => {
  if (override) return override;
  const sniffed = (await fileTypeFromFile(path))?.mime;
  if (sniffed) return sniffed;
  const ext = nodePath.extname(path).toLowerCase();
  return EXT_MIME[ext] ?? "application/octet-stream";
};
