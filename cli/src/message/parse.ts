import { PublicKey } from "@solana/web3.js";
import { BN, MessageType } from "xpkt-sdk";

export type CliMessageContentType = "text" | "url" | "irys" | "arweave" | "ipfs" | "custom";

export function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

export function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parsePublicKey(value: unknown, name = "public key"): PublicKey {
  try {
    return new PublicKey(requiredString(value, name));
  } catch (err) {
    throw new Error(`Invalid ${name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function parseOptionalPublicKey(value: unknown, name = "public key"): PublicKey | undefined {
  const str = optionalString(value);
  return str ? parsePublicKey(str, name) : undefined;
}

export function parseInteger(value: unknown, name: string): number {
  const str = String(value ?? "").trim();
  if (!/^\d+$/.test(str)) throw new Error(`${name} must be a positive integer`);
  const n = Number(str);
  if (!Number.isSafeInteger(n)) throw new Error(`${name} is too large`);
  return n;
}

export function parseOptionalInteger(value: unknown, name: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseInteger(value, name);
}

export function parseContentType(value: unknown): CliMessageContentType {
  const v = String(value ?? "irys").trim().toLowerCase();
  if (["text", "url", "irys", "arweave", "ipfs", "custom"].includes(v)) {
    return v as CliMessageContentType;
  }
  throw new Error("--content-type must be text, url, irys, arweave, ipfs, or custom");
}

export function messageTypeFromContentType(type: CliMessageContentType, customType?: unknown): MessageType {
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
    case "custom": {
      const n = parseInteger(customType, "--custom-type");
      return n as MessageType;
    }
  }
}

export function parseSolToLamportsBN(value: unknown): BN {
  const raw = requiredString(value, "SOL amount");
  if (!/^\d+(\.\d{1,9})?$/.test(raw)) {
    throw new Error("SOL amount must be a decimal with max 9 decimals");
  }
  const [whole, frac = ""] = raw.split(".");
  const lamports = BigInt(whole) * 1_000_000_000n + BigInt((frac + "000000000").slice(0, 9));
  if (lamports <= 0n) throw new Error("SOL amount must be greater than 0");
  return new BN(lamports.toString());
}

export function bnToString(value: any): string {
  if (!value) return "0";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return String(value);
  if (typeof value.toString === "function") return value.toString();
  return String(value);
}

export function lamportsToSolText(value: any): string {
  const raw = BigInt(bnToString(value));
  const whole = raw / 1_000_000_000n;
  const frac = raw % 1_000_000_000n;
  const fracText = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return fracText ? `${whole}.${fracText}` : whole.toString();
}

export function looksLikeBase58PublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}
