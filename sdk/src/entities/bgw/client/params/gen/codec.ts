import { concatBytes } from "../../../../../utils/bytes.js";
import { utf8 } from "../../../../../utils/encoding.js";
import { sha256 } from "@noble/hashes/sha2";
import type { BgwBinaryParamsChunkMeta, BgwBinaryParamsManifest, DecodedBgwBinaryParamsChunk } from "../../../types/params.js";
import { hex } from "../../../../../crypto/utils/hash.js";
import BN from "bn.js";

const MAGIC = new Uint8Array([0x58, 0x50, 0x4b, 0x54, 0x42, 0x47, 0x57, 0x31]); // XPKTBGW1
const VERSION = 1;
const HEADER_BYTES = 64;
export const BGW_G1_COMPRESSED_BYTES = 48 as const;
export const BGW_G2_COMPRESSED_BYTES = 96 as const;

function u32(view: DataView, offset: number): number {
    return view.getUint32(offset, true);
}

function setU32(view: DataView, offset: number, value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
        throw new Error(`u32 out of range: ${value}`);
    }
    view.setUint32(offset, value, true);
}

function pointOrZero(point: Uint8Array, len: number): Uint8Array {
    if (!point.length) return new Uint8Array(len);
    if (point.length !== len) throw new Error(`bad point length: expected ${len}, got ${point.length}`);
    return point;
}

function isZeroBytes(bytes: Uint8Array): boolean {
  for (const b of bytes) if (b !== 0) return false;
  return true;
}

function decodeFixedPoint(bytes: Uint8Array): Uint8Array {
  return isZeroBytes(bytes) ? new Uint8Array() : bytes;
}


function requirePositiveInt(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer, got ${value}`);
}


function validatePowerRange(startPower: number, endPower: number): void {
  requirePositiveInt("startPower", startPower);
  requirePositiveInt("endPower", endPower);
  if (endPower < startPower) throw new Error(`bad power range ${startPower}..${endPower}`);
}

function readFixedPoints(bytes: Uint8Array, offset: number, count: number, pointLen: number): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    const start = offset + i * pointLen;
    const end = start + pointLen;
    if (end > bytes.length) throw new Error("truncated binary BGW params chunk");
    out.push(decodeFixedPoint(bytes.slice(start, end)));
  }
  return out;
}

/**
 * Encode one prefix-only binary chunk.
 *
 * Storage model:
 * - G1 prefix stores local prefix[1..count] for public power indices start..end.
 * - G2 prefix stores local prefix[1..count] only for indices <= capacity.
 * - prefix[0] is implicit identity/zero and is not stored.
 * - empty/identity prefixes are encoded as all-zero fixed point bytes.
 */
export function encodeBgwBinaryParamsChunk(args: {
    index: number;
    startPower: number;
    endPower: number;
    capacity: number;
    chunkPowerCount: number;
    g1Prefix: Uint8Array[];
    g2Prefix: Uint8Array[];
}): Uint8Array {

    const expectedG1Count = args.endPower - args.startPower + 1;
    if (args.g1Prefix.length !== expectedG1Count) {
        throw new Error(`g1Prefix length mismatch: expected ${expectedG1Count}, got ${args.g1Prefix.length}`);
    }

    const g2End = Math.min(args.endPower, args.capacity);
    const expectedG2Count = g2End >= args.startPower ? g2End - args.startPower + 1 : 0;
    if (args.g2Prefix.length !== expectedG2Count) {
        throw new Error(`g2Prefix length mismatch: expected ${expectedG2Count}, got ${args.g2Prefix.length}`);
    }

    const g1Offset = HEADER_BYTES;
    const g2Offset = g1Offset + args.g1Prefix.length * BGW_G1_COMPRESSED_BYTES;
    const total = g2Offset + args.g2Prefix.length * BGW_G2_COMPRESSED_BYTES;
    const out = new Uint8Array(total);
    out.set(MAGIC, 0);

    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    setU32(view, 8, VERSION);
    setU32(view, 12, HEADER_BYTES);
    setU32(view, 16, args.index);
    setU32(view, 20, args.startPower);
    setU32(view, 24, args.endPower);
    setU32(view, 28, args.capacity);
    setU32(view, 32, args.chunkPowerCount);
    setU32(view, 36, args.g1Prefix.length);
    setU32(view, 40, args.g2Prefix.length);
    setU32(view, 44, g1Offset);
    setU32(view, 48, g2Offset);
    setU32(view, 52, total);

    let off = g1Offset;
    for (const point of args.g1Prefix) {
        out.set(pointOrZero(point, BGW_G1_COMPRESSED_BYTES), off);
        off += BGW_G1_COMPRESSED_BYTES;
    }
    off = g2Offset;
    for (const point of args.g2Prefix) {
        out.set(pointOrZero(point, BGW_G2_COMPRESSED_BYTES), off);
        off += BGW_G2_COMPRESSED_BYTES;
    }

    return out;
}

export function chunkIndexForPower(manifest: BgwBinaryParamsManifest, powerIndex: BN): number {
  if (powerIndex.lte(new BN(0))) throw new Error(`bad power index ${powerIndex}`);
  if (powerIndex.gt(new BN(manifest.maxPower))) throw new Error(`power index ${powerIndex} > maxPower ${manifest.maxPower}`);
  return Math.floor(powerIndex.sub(new BN(1)).div(new BN(manifest.chunkPowerCount)).toNumber());
}


export function makeBgwParamsId(args: {
    curve: string;
    capacity: number;
    paramsRoot: Uint8Array;
    label: string;
}): Uint8Array {
    return sha256(concatBytes(
        utf8("xpkt-bgw-params-id-v1"),
        utf8(args.curve),
        utf8(args.capacity.toString()),
        utf8(args.label),
        args.paramsRoot,
    ));
}

export function makeChunkMeta(args: {
  index: number;
  startPower: number;
  endPower: number;
  bytes: Uint8Array;
  g1PrefixCount: number;
  g2PrefixCount: number;
}): BgwBinaryParamsChunkMeta {
  return {
    index: args.index,
    startPower: args.startPower,
    endPower: args.endPower,
    byteLength: args.bytes.length,
    chunkHash: hex(sha256(args.bytes)),
    g1PrefixCount: args.g1PrefixCount,
    g2PrefixCount: args.g2PrefixCount,
  };
}

export function decodeBgwBinaryParamsChunk(bytes: Uint8Array): DecodedBgwBinaryParamsChunk {
  if (bytes.length < HEADER_BYTES) throw new Error("binary BGW params chunk too short");
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) throw new Error("bad binary BGW params chunk magic");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = u32(view, 8);
  if (version !== VERSION) throw new Error(`unsupported binary BGW params version ${version}`);
  const headerBytes = u32(view, 12);
  if (headerBytes !== HEADER_BYTES) throw new Error(`unsupported binary BGW params header size ${headerBytes}`);

  const index = u32(view, 16);
  const startPower = u32(view, 20);
  const endPower = u32(view, 24);
  const capacity = u32(view, 28);
  const chunkPowerCount = u32(view, 32);
  const g1PrefixCount = u32(view, 36);
  const g2PrefixCount = u32(view, 40);
  const g1Offset = u32(view, 44);
  const g2Offset = u32(view, 48);
  const totalBytes = u32(view, 52);

  if (totalBytes !== bytes.length) {
    throw new Error(`binary BGW params chunk length mismatch: header=${totalBytes}, actual=${bytes.length}`);
  }
  validatePowerRange(startPower, endPower);
  if (g1PrefixCount !== endPower - startPower + 1) throw new Error("bad g1 prefix count in binary BGW chunk");

  return {
    index,
    startPower,
    endPower,
    capacity,
    chunkPowerCount,
    g1Prefix: readFixedPoints(bytes, g1Offset, g1PrefixCount, BGW_G1_COMPRESSED_BYTES),
    g2Prefix: readFixedPoints(bytes, g2Offset, g2PrefixCount, BGW_G2_COMPRESSED_BYTES),
  };
}