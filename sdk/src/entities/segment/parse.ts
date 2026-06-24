import type { Segment, SegmentSlot } from "./types.js";

export const THREAD_ID_BYTES = 4;

/**
 * Parses a raw segment buffer into a structured `Segment` object.
*/
export function parseSegment(
  rawInput: Uint8Array | Buffer | number[],
): Segment {
  const raw = rawInput instanceof Uint8Array
    ? rawInput
    : Uint8Array.from(rawInput);

  if (raw.length % THREAD_ID_BYTES !== 0) {
    throw new Error(
      `Invalid segment length ${raw.length}. Expected a multiple of ${THREAD_ID_BYTES}.`,
    );
  }

  const capacity = raw.length / THREAD_ID_BYTES;

  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

  const slots: SegmentSlot[] = [];

  for (let index = 0; index < capacity; index++) {
    const offset = index * THREAD_ID_BYTES;
    const threadId = view.getUint32(offset, true); // little-endian

    slots.push({
      index,
      threadId,
      isEmpty: threadId === 0,
    });
  }

  const liveSlots = slots.slice(0, capacity);

  const ids = liveSlots
    .map((slot) => slot.threadId)
    .filter((threadId) => threadId !== 0);

  const used = ids.length;
  const remaining = capacity - used;

  return {
    raw,
    byteLength: raw.length,
    capacity,
    slots,
    ids,
    used,
    remaining,
    isFull: used >= capacity,
    isEmpty: used === 0,

    get(index: number): number {
      if (!Number.isInteger(index) || index < 0 || index >= capacity) {
        throw new Error(
          `Invalid segment index ${index}. Expected 0 <= index < ${capacity}.`,
        );
      }

      return slots[index].threadId;
    },

    find(threadId: number): number | undefined {
      if (!Number.isInteger(threadId) || threadId <= 0 || threadId > 0xffffffff) {
        return undefined;
      }

      const slot = liveSlots.find((slot) => slot.threadId === threadId);
      return slot?.index;
    },

    has(threadId: number): boolean {
      return this.find(threadId) !== undefined;
    },
  };
}

export function emptySegment(capacity: number): Segment {
  const raw = new Uint8Array(capacity * THREAD_ID_BYTES);
  return parseSegment(raw);
}