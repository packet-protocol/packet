import fs from "fs";

export const readCryptoInput = async (options: { text?: string; file?: string; url?: string }): Promise<string> => {
  const count = [options.text, options.file, options.url].filter(Boolean).length;
  if (count !== 1) throw new Error("Provide exactly one of --text, --file, or --url");
  if (options.text) return options.text;
  if (options.file) return fs.readFileSync(options.file, "utf-8");
  const res = await fetch(options.url!);
  if (!res.ok) throw new Error(`Failed to fetch ${options.url}: HTTP ${res.status}`);
  return await res.text();
};
