import { PublicKey } from "@solana/web3.js";
import { BN } from "xpkt-sdk";

export const requiredString = (value: unknown, name: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
};

export const optionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const parsePublicKey = (value: unknown, name = "public key"): PublicKey => {
  try {
    return new PublicKey(requiredString(value, name));
  } catch (err) {
    throw new Error(`Invalid ${name}: ${err instanceof Error ? err.message : String(err)}`);
  }
};

export const parseOptionalPublicKey = (value: unknown, name = "public key"): PublicKey | undefined => {
  const str = optionalString(value);
  return str ? parsePublicKey(str, name) : undefined;
};

export const parseInteger = (value: unknown, name: string): number => {
  const str = String(value ?? "").trim();
  if (!/^\d+$/.test(str)) throw new Error(`${name} must be a positive integer`);
  const n = Number(str);
  if (!Number.isSafeInteger(n)) throw new Error(`${name} is too large`);
  return n;
};

export const parseOptionalInteger = (value: unknown, name: string): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  return parseInteger(value, name);
};

export const parseSolToLamportsBN = (value: unknown): BN => {
  const raw = requiredString(value, "SOL amount");
  if (!/^\d+(\.\d{1,9})?$/.test(raw)) {
    throw new Error("SOL amount must be a decimal with max 9 decimals");
  }
  const [whole, frac = ""] = raw.split(".");
  const lamports = BigInt(whole) * 1_000_000_000n + BigInt((frac + "000000000").slice(0, 9));
  if (lamports <= 0n) throw new Error("SOL amount must be greater than 0");
  return new BN(lamports.toString());
};

export const bnToString = (value: any): string => {
  if (!value) return "0";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return String(value);
  if (typeof value.toString === "function") return value.toString();
  return String(value);
};

export const lamportsToSolText = (value: any): string => {
  const raw = BigInt(bnToString(value));
  const whole = raw / 1_000_000_000n;
  const frac = raw % 1_000_000_000n;
  const fracText = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return fracText ? `${whole}.${fracText}` : whole.toString();
};

export const looksLikeBase58PublicKey = (value: string): boolean => {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
};
