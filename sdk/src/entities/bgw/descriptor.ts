/**
 * Canonical recipient descriptor encodings 
 *
 * TS is authoritative for these encodings; the program treats descriptor bytes
 * as opaque (they are only bound into the recipient state root).
 *
 * Slots are sorted unique ascending u32, 1-based. All functions are pure.
 * BN is accepted at the boundary; internally everything is u32-safe `number`.
 */

import BN from "bn.js";
import { concatBytes } from "../../utils/bytes";
import { RecipientEncoding, type RecipientEncodingId } from "./constants";

const U32_MAX = 0xffffffff;

export type SlotInput = number | BN;

export type EncodedRecipientDescriptor = {
    encoding: RecipientEncodingId;
    bytes: Uint8Array;
};

function toSlotNumber(value: SlotInput): number {
    const n = BN.isBN(value) ? value.toNumber() : value;
    if (!Number.isInteger(n) || n < 0 || n > U32_MAX) {
        throw new Error(`slot out of u32 range: ${String(n)}`);
    }
    return n;
}

/** Normalize to sorted unique ascending 1-based u32 slots. Throws on duplicates / slot 0. */
export function normalizeSlots(slots: SlotInput[]): number[] {
    const out = slots.map(toSlotNumber).sort((a, b) => a - b);
    for (let i = 0; i < out.length; i++) {
        if (out[i] < 1) throw new Error(`slots are 1-based, got ${out[i]}`);
        if (i > 0 && out[i] === out[i - 1]) throw new Error(`duplicate slot ${out[i]}`);
    }
    return out;
}

// ---------------------------------------------------------------------------
// LEB128 unsigned varint (u32 range, minimal encoding enforced on decode)
// ---------------------------------------------------------------------------

export function encodeVarint(value: number): Uint8Array {
    if (!Number.isInteger(value) || value < 0 || value > U32_MAX) {
        throw new Error(`varint value out of u32 range: ${String(value)}`);
    }
    const out: number[] = [];
    let v = value;
    while (true) {
        const byte = v & 0x7f;
        v = v >>> 7;
        if (v === 0) {
            out.push(byte);
            break;
        }
        out.push(byte | 0x80);
    }
    return Uint8Array.from(out);
}

export function decodeVarint(bytes: Uint8Array, offset: number): { value: number; next: number } {
    let result = 0;
    let shift = 0;
    let pos = offset;
    for (let i = 0; i < 5; i++) {
        if (pos >= bytes.length) throw new Error("truncated varint");
        const byte = bytes[pos++];
        // 5th byte carries bits 28..34; only the low nibble fits in u32, and it
        // must not have a continuation bit.
        if (i === 4 && (byte & 0xf0) !== 0) throw new Error("varint exceeds u32 range");
        result += (byte & 0x7f) * 2 ** shift;
        if ((byte & 0x80) === 0) {
            if (i > 0 && byte === 0) throw new Error("non-minimal varint encoding");
            if (result > U32_MAX) throw new Error("varint exceeds u32 range");
            return { value: result, next: pos };
        }
        shift += 7;
    }
    throw new Error("varint too long (max 5 bytes for u32)");
}

// ---------------------------------------------------------------------------
// DeltaVarint (encoding id 1): varint slot[0], then varint gaps (>= 1)
// ---------------------------------------------------------------------------

export function encodeDeltaVarint(slots: SlotInput[]): Uint8Array {
    const s = normalizeSlots(slots);
    if (!s.length) return new Uint8Array();
    const parts: Uint8Array[] = [encodeVarint(s[0])];
    for (let i = 1; i < s.length; i++) parts.push(encodeVarint(s[i] - s[i - 1]));
    return concatBytes(...parts);
}

export function decodeDeltaVarint(bytes: Uint8Array, explicitCount: number): number[] {
    requireCount(explicitCount);
    if (explicitCount === 0) {
        if (bytes.length !== 0) throw new Error("DeltaVarint descriptor with explicitCount 0 must be empty");
        return [];
    }
    const slots: number[] = [];
    let offset = 0;
    let prev = 0;
    for (let k = 0; k < explicitCount; k++) {
        const { value, next } = decodeVarint(bytes, offset);
        offset = next;
        if (value < 1) {
            throw new Error(k === 0 ? "DeltaVarint first slot must be >= 1" : "DeltaVarint gap must be >= 1");
        }
        const slot = prev + value;
        if (slot > U32_MAX) throw new Error("DeltaVarint slot exceeds u32 range");
        slots.push(slot);
        prev = slot;
    }
    if (offset !== bytes.length) throw new Error("DeltaVarint descriptor has trailing bytes (explicitCount mismatch)");
    return slots;
}

// ---------------------------------------------------------------------------
// Ranges (encoding id 2): varint rangeCount, then per range
// varint startGap (start - prevEnd, prevEnd init 0; first >= 1, later >= 2),
// varint len (>= 1, run start..start+len-1)
// ---------------------------------------------------------------------------

export function encodeRanges(slots: SlotInput[]): Uint8Array {
    const s = normalizeSlots(slots);
    if (!s.length) return encodeVarint(0);

    const ranges: { start: number; len: number }[] = [];
    let start = s[0];
    let len = 1;
    for (let i = 1; i < s.length; i++) {
        if (s[i] === s[i - 1] + 1) {
            len++;
        } else {
            ranges.push({ start, len });
            start = s[i];
            len = 1;
        }
    }
    ranges.push({ start, len });

    const parts: Uint8Array[] = [encodeVarint(ranges.length)];
    let prevEnd = 0;
    for (const range of ranges) {
        parts.push(encodeVarint(range.start - prevEnd));
        parts.push(encodeVarint(range.len));
        prevEnd = range.start + range.len - 1;
    }
    return concatBytes(...parts);
}

export function decodeRanges(bytes: Uint8Array, explicitCount: number): number[] {
    requireCount(explicitCount);
    let offset = 0;
    const head = decodeVarint(bytes, offset);
    const rangeCount = head.value;
    offset = head.next;

    const slots: number[] = [];
    let prevEnd = 0;
    for (let r = 0; r < rangeCount; r++) {
        const gap = decodeVarint(bytes, offset);
        offset = gap.next;
        const minGap = r === 0 ? 1 : 2;
        if (gap.value < minGap) throw new Error(`Ranges startGap must be >= ${minGap}`);

        const lenRes = decodeVarint(bytes, offset);
        offset = lenRes.next;
        if (lenRes.value < 1) throw new Error("Ranges len must be >= 1");

        const start = prevEnd + gap.value;
        const end = start + lenRes.value - 1;
        if (end > U32_MAX) throw new Error("Ranges slot exceeds u32 range");
        if (slots.length + lenRes.value > explicitCount) {
            throw new Error("Ranges descriptor explicitCount mismatch");
        }
        for (let slot = start; slot <= end; slot++) slots.push(slot);
        prevEnd = end;
    }
    if (offset !== bytes.length) throw new Error("Ranges descriptor has trailing bytes");
    if (slots.length !== explicitCount) throw new Error("Ranges descriptor explicitCount mismatch");
    return slots;
}

// ---------------------------------------------------------------------------
// Descriptor-level codec
// ---------------------------------------------------------------------------

/**
 * Encode a slot set picking the smallest of Empty / DeltaVarint / Ranges.
 * Tie between DeltaVarint and Ranges resolves to DeltaVarint (canonical).
 * Bitmap (3) is reserved and never emitted.
 */
export function encodeDescriptor(slots: SlotInput[]): EncodedRecipientDescriptor {
    const s = normalizeSlots(slots);
    if (!s.length) return { encoding: RecipientEncoding.Empty, bytes: new Uint8Array() };

    const delta = encodeDeltaVarint(s);
    const ranges = encodeRanges(s);
    return delta.length <= ranges.length
        ? { encoding: RecipientEncoding.DeltaVarint, bytes: delta }
        : { encoding: RecipientEncoding.Ranges, bytes: ranges };
}

/**
 * Decode descriptor bytes, validating that exactly `explicitCount` slots are
 * encoded and that all bytes are consumed. Returns sorted ascending u32 slots.
 */
export function decodeDescriptor(encoding: number, bytes: Uint8Array, explicitCount: number): number[] {
    requireCount(explicitCount);
    switch (encoding) {
        case RecipientEncoding.Empty:
            if (explicitCount !== 0) throw new Error("Empty descriptor requires explicitCount 0");
            if (bytes.length !== 0) throw new Error("Empty descriptor must have zero bytes");
            return [];
        case RecipientEncoding.DeltaVarint:
            if (explicitCount === 0) throw new Error("canonical empty slot set must use Empty encoding");
            return decodeDeltaVarint(bytes, explicitCount);
        case RecipientEncoding.Ranges:
            if (explicitCount === 0) throw new Error("canonical empty slot set must use Empty encoding");
            return decodeRanges(bytes, explicitCount);
        case RecipientEncoding.Bitmap:
            throw new Error("Bitmap recipient encoding is reserved and not implemented");
        default:
            throw new Error(`unknown recipient encoding ${encoding}`);
    }
}

function requireCount(explicitCount: number): void {
    if (!Number.isInteger(explicitCount) || explicitCount < 0 || explicitCount > U32_MAX) {
        throw new Error(`explicitCount out of u32 range: ${String(explicitCount)}`);
    }
}
