import { PublicKey } from "@solana/web3.js";
import type { Bytes } from "xpkt-sdk";
import { looksLikeBase58PublicKey, requiredString } from "../input/index.js";

const HEX32 = /^[0-9a-fA-F]{64}$/;

export const parseHex32 = (value: unknown, name: string): Bytes => {
  const raw = requiredString(value, name).replace(/^0x/, "");
  if (!HEX32.test(raw)) throw new Error(`${name} must be 32 bytes of hex (64 hex chars)`);
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16);
  return out;
};

export const parseOptionalHex32 = (value: unknown, name: string): Bytes | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  return parseHex32(value, name);
};

export const parseRoomRef = (value: unknown): PublicKey | Bytes => {
  const raw = requiredString(value, "room");
  if (looksLikeBase58PublicKey(raw) && !HEX32.test(raw.replace(/^0x/, ""))) {
    return new PublicKey(raw);
  }
  return parseHex32(raw, "room");
};

export const parseRoomTarget = (value: unknown): { roomId?: Bytes; address?: PublicKey } => {
  const ref = parseRoomRef(value);
  return ref instanceof PublicKey ? { address: ref } : { roomId: ref };
};
