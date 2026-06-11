import BN from "bn.js";

export function uniqueSorted(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]) throw new Error(`duplicate slot ${sorted[i]}`);
  }
  return sorted;
}

export function uniqueSortedBN(values: BN[]): BN[] {
  const sorted = [...values].sort((a, b) => a.cmp(b));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].eq(sorted[i - 1])) throw new Error(`duplicate slot ${sorted[i].toString()}`);
  }
  return sorted;
}

export function pushNonEmpty(out: Uint8Array[], value: Uint8Array): void {
  if (value.length) out.push(value);
}

export function requireSlot(capacity: BN, slot: BN): void {
  if (slot.lte(new BN(0)) || slot.gt(capacity)) throw new Error(`bad BGW slot ${slot.toString()}`);
}