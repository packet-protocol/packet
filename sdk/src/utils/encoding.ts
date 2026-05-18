import type { Bytes } from "../types/common";

export function toBase64(bytes: Bytes): string {
  return Buffer.from(bytes).toString("base64");
}

export function fromBase64(value: string): Bytes {
  return new Uint8Array(Buffer.from(value, "base64"));
}

export function utf8(input: string): Bytes {
  return new TextEncoder().encode(input);
}

export function text(bytes: Bytes): string {
  return new TextDecoder().decode(bytes);
}