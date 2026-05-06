import { sha256 } from "@noble/hashes/sha2";
import type { Bytes } from "../../types/common";

export function hex(bytes: Bytes): string {
  return Buffer.from(bytes).toString("hex");
}

export function hashSha256(bytes: Bytes): Bytes {
  return sha256(bytes);
}

export function hashLabel(label: string, bytes: Bytes): string {
  return `${label}:${hex(hashSha256(bytes))}`;
}