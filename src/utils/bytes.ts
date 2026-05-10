import type { Bytes } from "../types/common";
import BN from "bn.js";

export function concatBytes(...arrays: Bytes[]): Bytes {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;

  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }

  return out;
}

export function toBN(value: bigint | number | BN): BN {
  if (BN.isBN(value)) return value;
  if (typeof value === "bigint") return new BN(value.toString());
  return new BN(value);
}

export function u32Le(value: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(value >>> 0, 0);
  return b;
}

export function u64Le(value: bigint | number | BN): Buffer {
  return toBN(value).toArrayLike(Buffer, "le", 8);
}

export function asBuffer(value?: Uint8Array | Buffer | number[] | null): Buffer {
  if (!value) return Buffer.alloc(0);
  return Buffer.from(value);
}

export function fixed8(value?: Uint8Array | Buffer | number[] | null): number[] {
  const src = asBuffer(value);
  const out = Buffer.alloc(8);
  src.copy(out, 0, 0, Math.min(8, src.length));
  return Array.from(out);
}

export function randomThreadId(): number {
  // 0 is reserved as invalid, so retry once if the universe jokes on us.
  let x = crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;
  if (x === 0) x = 1;
  return x;
}

export function bytesToHex(bytes: Uint8Array): string {
    return [...bytes]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}