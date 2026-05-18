
export type SegmentSlot = {
  index: number;
  threadId: number;
  isEmpty: boolean;
};

export type Segment = {
  /**
   * Raw segment bytes.
   */
  raw: Uint8Array;

  /**
   * Segment byte length.
   */
  byteLength: number;

  /**
   * Number of u32 thread-id slots.
   */
  capacity: number;

  /**
   * Parsed slots, including empty zero slots.
   */
  slots: SegmentSlot[];

  /**
   * Parsed non-zero thread IDs in segment order.
   *
   * Index 0 = newest.
   */
  ids: number[];

  /**
   * Number of non-zero IDs.
   */
  used: number;

  /**
   * Number of zero/empty slots.
   */
  remaining: number;

  /**
   * Whether all slots are occupied.
   */
  isFull: boolean;

  /**
   * Whether no thread IDs are present.
   */
  isEmpty: boolean;

  /**
   * Get thread ID at slot index.
   * Returns 0 for an empty slot.
   */
  get(index: number): number;

  /**
   * Find the slot index of a thread ID.
   */
  find(threadId: number): number | undefined;

  /**
   * Whether this segment contains the given thread ID.
   */
  has(threadId: number): boolean;
};

