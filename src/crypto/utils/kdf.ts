import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha2";
import { utf8 } from "../../utils/encoding";
import type { Bytes } from "../../types/common";

export function derive32(seed: Bytes, label: string): Bytes {
  return hkdf(sha256, seed, undefined, utf8(label), 32);
}