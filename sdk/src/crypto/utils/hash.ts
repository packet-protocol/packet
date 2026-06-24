import { sha256 } from "@noble/hashes/sha2";
import type { Bytes } from "../../types/common.js";

export function hex(bytes: Bytes): string {
  return Buffer.from(bytes).toString("hex");
}

export function hashSha256(bytes: Bytes): Bytes {
  return sha256(bytes);
}

export function hashLabel(label: string, bytes: Bytes): string {
  return `${label}:${hex(hashSha256(bytes))}`;
}

export function hexToBytes(hexStr: string): Uint8Array {
  return new Uint8Array(Buffer.from(hexStr, "hex"));
}