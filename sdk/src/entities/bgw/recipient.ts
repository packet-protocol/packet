/**
 * Recipient root chain + pure recipient state machine.
 *
 * The hash layouts mirror the Rust `state/room/recipient.rs` `hashv` calls
 * EXACTLY (sha256 over concatenated slices, little-endian integers):
 *
 * checkpoint_state_root:
 *   "xpkt-recipient-checkpoint-v1", room, member_version_le(u64), [mode],
 *   [encoding], assigned_until_le(u32), explicit_count_le(u32), descriptor_bytes
 *
 * delta_state_root:
 *   "xpkt-recipient-delta-v1", room, previous_root, member_version_le(u64),
 *   [mode], assigned_until_le(u32), explicit_count_le(u32), [op], slot_le(u32)
 *
 * page_chain_hash:
 *   "xpkt-recipient-page-v1", prev, payload_hash
 *
 * For ExternalCheckpoint the checkpoint root is computed with
 * `descriptor_bytes = pending_pages_hash` (32 bytes).
 *
 * Everything here is pure: no RPC, no engine — usable by both the admin
 * planner and the reader reconstruction path.
 */

import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha2";
import { concatBytes, toBN, u32Le, u64Le } from "../../utils/bytes.js";
import { utf8 } from "../../utils/encoding.js";
import {
    RECIPIENT_CHECKPOINT_DOMAIN,
    RECIPIENT_CHECKPOINT_INTERVAL,
    RECIPIENT_DELTA_DOMAIN,
    RECIPIENT_PAGE_DOMAIN,
    RecipientDeltaOp,
    RecipientEncoding,
    RecipientMode,
    ROOM_MAX_INLINE_DESCRIPTOR_BYTES,
    ROOM_MAX_PAGE_BYTES,
    type RecipientDeltaOpId,
    type RecipientEncodingId,
    type RecipientModeId,
} from "./constants.js";
import { decodeDescriptor, encodeDescriptor, type EncodedRecipientDescriptor } from "./descriptor.js";

export type RoomKeyInput = PublicKey | Uint8Array;

function roomBytes(room: RoomKeyInput): Uint8Array {
    const bytes = room instanceof PublicKey ? room.toBytes() : room;
    if (bytes.length !== 32) throw new Error(`room key must be 32 bytes, got ${bytes.length}`);
    return bytes;
}

// ---------------------------------------------------------------------------
// Root chain hashes
// ---------------------------------------------------------------------------

export function checkpointStateRoot(args: {
    room: RoomKeyInput;
    memberVersion: BN | number;
    mode: number;
    encoding: number;
    assignedUntilSlot: number;
    explicitCount: number;
    descriptorBytes: Uint8Array;
}): Uint8Array {
    return sha256(concatBytes(
        utf8(RECIPIENT_CHECKPOINT_DOMAIN),
        roomBytes(args.room),
        u64Le(args.memberVersion),
        Uint8Array.of(args.mode),
        Uint8Array.of(args.encoding),
        u32Le(args.assignedUntilSlot),
        u32Le(args.explicitCount),
        args.descriptorBytes,
    ));
}

export function deltaStateRoot(args: {
    room: RoomKeyInput;
    previousRoot: Uint8Array;
    memberVersion: BN | number;
    mode: number;
    assignedUntilSlot: number;
    explicitCount: number;
    op: number;
    slot: number;
}): Uint8Array {
    if (args.previousRoot.length !== 32) throw new Error("previousRoot must be 32 bytes");
    return sha256(concatBytes(
        utf8(RECIPIENT_DELTA_DOMAIN),
        roomBytes(args.room),
        args.previousRoot,
        u64Le(args.memberVersion),
        Uint8Array.of(args.mode),
        u32Le(args.assignedUntilSlot),
        u32Le(args.explicitCount),
        Uint8Array.of(args.op),
        u32Le(args.slot),
    ));
}

export function pageChainHash(prev: Uint8Array, payloadHash: Uint8Array): Uint8Array {
    if (prev.length !== 32) throw new Error("page chain prev must be 32 bytes");
    if (payloadHash.length !== 32) throw new Error("page payloadHash must be 32 bytes");
    return sha256(concatBytes(
        utf8(RECIPIENT_PAGE_DOMAIN),
        prev,
        payloadHash,
    ));
}

/** Split canonical checkpoint descriptor bytes into staged page payloads (<= ROOM_MAX_PAGE_BYTES each). */
export function splitDescriptorPages(descriptorBytes: Uint8Array): Uint8Array[] {
    const pages: Uint8Array[] = [];
    for (let offset = 0; offset < descriptorBytes.length; offset += ROOM_MAX_PAGE_BYTES) {
        pages.push(descriptorBytes.slice(offset, offset + ROOM_MAX_PAGE_BYTES));
    }
    return pages;
}

/** Running page chain hash exactly as the program computes pending_pages_hash. */
export function pagesChainHash(pages: Uint8Array[]): Uint8Array {
    let prev: Uint8Array = new Uint8Array(32);
    for (const page of pages) prev = pageChainHash(prev, sha256(page));
    return prev;
}

// ---------------------------------------------------------------------------
// Recipient state machine
// ---------------------------------------------------------------------------

export type RecipientState = {
    mode: RecipientModeId;
    /** Encoding of the last checkpoint (room mirror; unchanged by deltas). */
    encoding: RecipientEncodingId;
    /** High-water mark of assigned slots (same semantics in both modes). */
    assignedUntilSlot: number;
    /** Exclude mode: removed slots within 1..assignedUntilSlot. Include mode: active slots. */
    explicitSlots: Set<number>;
    explicitCount: number;
    stateRoot: Uint8Array;
    deltaDepth: number;
    checkpointEpoch: BN;
    memberVersion: BN;
};

export type RecipientMutation = {
    op: RecipientDeltaOpId;
    slot: number;
};

/** Initial room recipient state (init defaults). */
export function initialRecipientState(room: RoomKeyInput): RecipientState {
    return {
        mode: RecipientMode.Exclude,
        encoding: RecipientEncoding.Empty,
        assignedUntilSlot: 0,
        explicitSlots: new Set(),
        explicitCount: 0,
        stateRoot: checkpointStateRoot({
            room,
            memberVersion: 0,
            mode: RecipientMode.Exclude,
            encoding: RecipientEncoding.Empty,
            assignedUntilSlot: 0,
            explicitCount: 0,
            descriptorBytes: new Uint8Array(),
        }),
        deltaDepth: 0,
        checkpointEpoch: new BN(0),
        memberVersion: new BN(0),
    };
}

export function stateFromCheckpoint(args: {
    room: RoomKeyInput;
    epoch: BN | number;
    memberVersion: BN | number;
    mode: number;
    encoding: number;
    assignedUntilSlot: number;
    explicitCount: number;
    /** Canonical encoded descriptor (for ExternalCheckpoint: the reassembled page bytes). */
    descriptorBytes: Uint8Array;
    /**
     * For ExternalCheckpoint: the pending_pages_hash the root binds to
     * (root uses this instead of descriptorBytes).
     */
    externalPagesHash?: Uint8Array;
}): RecipientState {
    const mode = requireMode(args.mode);
    const slots = decodeDescriptor(args.encoding, args.descriptorBytes, args.explicitCount);
    if (slots.length && slots[slots.length - 1] > args.assignedUntilSlot) {
        throw new Error("explicit slot exceeds assignedUntilSlot");
    }
    if (args.externalPagesHash && args.externalPagesHash.length !== 32) {
        throw new Error("externalPagesHash must be 32 bytes");
    }
    return {
        mode,
        encoding: args.encoding as RecipientEncodingId,
        assignedUntilSlot: args.assignedUntilSlot,
        explicitSlots: new Set(slots),
        explicitCount: args.explicitCount,
        stateRoot: checkpointStateRoot({
            room: args.room,
            memberVersion: args.memberVersion,
            mode,
            encoding: args.encoding,
            assignedUntilSlot: args.assignedUntilSlot,
            explicitCount: args.explicitCount,
            descriptorBytes: args.externalPagesHash ?? args.descriptorBytes,
        }),
        deltaDepth: 0,
        checkpointEpoch: toBN(args.epoch),
        memberVersion: toBN(args.memberVersion),
    };
}

type MembershipTransition = {
    assignedUntilSlot: number;
    explicitSlots: Set<number>;
    explicitCount: number;
};

/**
 *  Delta transition table (mode never changes under a delta):
 * - Exclude+Activate: slot == assignedUntil+1 → new member (assigned+1, count same);
 *   else re-add: slot must currently be excluded (count-1, assigned same).
 * - Exclude+Remove: slot must be active in 1..assignedUntil (count+1).
 * - Include+Activate: slot must not be active (count+1, assigned = max(assigned, slot)).
 * - Include+Remove: slot must be active (count-1, assigned same).
 */
function transitionMembership(state: RecipientState, op: number, slot: number): MembershipTransition {
    if (!Number.isInteger(slot) || slot < 1 || slot > 0xffffffff) {
        throw new Error(`bad delta slot ${String(slot)}`);
    }
    const slots = new Set(state.explicitSlots);

    if (op === RecipientDeltaOp.Activate) {
        if (state.mode === RecipientMode.Exclude) {
            if (slot === state.assignedUntilSlot + 1) {
                return { assignedUntilSlot: slot, explicitSlots: slots, explicitCount: state.explicitCount };
            }
            if (!slots.delete(slot)) {
                throw new Error(`invalid Exclude+Activate: slot ${slot} is neither next slot ${state.assignedUntilSlot + 1} nor an excluded slot`);
            }
            return { assignedUntilSlot: state.assignedUntilSlot, explicitSlots: slots, explicitCount: state.explicitCount - 1 };
        }
        if (slots.has(slot)) throw new Error(`invalid Include+Activate: slot ${slot} is already active`);
        slots.add(slot);
        return {
            assignedUntilSlot: Math.max(state.assignedUntilSlot, slot),
            explicitSlots: slots,
            explicitCount: state.explicitCount + 1,
        };
    }

    if (op === RecipientDeltaOp.Remove) {
        if (state.mode === RecipientMode.Exclude) {
            if (slot > state.assignedUntilSlot) throw new Error(`invalid Exclude+Remove: slot ${slot} was never assigned`);
            if (slots.has(slot)) throw new Error(`invalid Exclude+Remove: slot ${slot} is already excluded`);
            slots.add(slot);
            return { assignedUntilSlot: state.assignedUntilSlot, explicitSlots: slots, explicitCount: state.explicitCount + 1 };
        }
        if (!slots.delete(slot)) throw new Error(`invalid Include+Remove: slot ${slot} is not active`);
        return { assignedUntilSlot: state.assignedUntilSlot, explicitSlots: slots, explicitCount: state.explicitCount - 1 };
    }

    throw new Error(`invalid recipient delta op ${op}`);
}

/**
 * Apply one Delta header (one membership mutation; member_version advances by
 * exactly 1). Throws when the delta would push delta_depth past
 * RECIPIENT_CHECKPOINT_INTERVAL (the program would reject it too).
 */
export function applyDelta(
    state: RecipientState,
    op: number,
    slot: number,
    memberVersion: BN | number,
    room: RoomKeyInput,
): RecipientState {
    const mv = toBN(memberVersion);
    if (!mv.eq(state.memberVersion.add(new BN(1)))) {
        throw new Error(`delta member_version must advance by exactly 1 (state ${state.memberVersion.toString()}, got ${mv.toString()})`);
    }
    const newDepth = state.deltaDepth + 1;
    if (newDepth > RECIPIENT_CHECKPOINT_INTERVAL) {
        throw new Error("recipient checkpoint required: delta depth would exceed RECIPIENT_CHECKPOINT_INTERVAL");
    }
    const next = transitionMembership(state, op, slot);
    return {
        mode: state.mode,
        // Delta headers store recipient_encoding = Empty on-chain; the local
        // mirror must match so later planning does not inherit a stale encoding.
        encoding: RecipientEncoding.Empty,
        assignedUntilSlot: next.assignedUntilSlot,
        explicitSlots: next.explicitSlots,
        explicitCount: next.explicitCount,
        stateRoot: deltaStateRoot({
            room,
            previousRoot: state.stateRoot,
            memberVersion: mv,
            mode: state.mode,
            assignedUntilSlot: next.assignedUntilSlot,
            explicitCount: next.explicitCount,
            op,
            slot,
        }),
        deltaDepth: newDepth,
        checkpointEpoch: state.checkpointEpoch,
        memberVersion: mv,
    };
}

/** Active slots of a (possibly transitioned) membership, sorted ascending. */
export function recipientActiveSlots(args: {
    mode: RecipientModeId;
    assignedUntilSlot: number;
    explicitSlots: Set<number>;
}): number[] {
    if (args.mode === RecipientMode.Include) {
        return [...args.explicitSlots].sort((a, b) => a - b);
    }
    const active: number[] = [];
    for (let slot = 1; slot <= args.assignedUntilSlot; slot++) {
        if (!args.explicitSlots.has(slot)) active.push(slot);
    }
    return active;
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

export type RecipientPlanNextState = {
    /** Mode AFTER this descriptor. */
    mode: RecipientModeId;
    assignedUntilSlot: number;
    explicitCount: number;
    explicitSlots: Set<number>;
};

export type RecipientDescriptorPlan =
    | (RecipientPlanNextState & {
        kind: "delta";
        op: RecipientDeltaOpId;
        slot: number;
        /** Room mirror encoding stays at the last checkpoint's encoding. */
        encoding: RecipientEncodingId;
    })
    | (RecipientPlanNextState & {
        kind: "inlineCheckpoint";
        encoding: RecipientEncodingId;
        descriptorBytes: Uint8Array;
    })
    | (RecipientPlanNextState & {
        kind: "externalCheckpoint";
        encoding: RecipientEncodingId;
        /** Full canonical descriptor bytes (concatenation of pages). */
        descriptorBytes: Uint8Array;
        /** Page payloads in index order, each <= ROOM_MAX_PAGE_BYTES. */
        pages: Uint8Array[];
        /** Expected pending_pages_hash after staging all pages. */
        pagesHash: Uint8Array;
    });

/**
 * Decide the next descriptor for an optional single mutation:
 *
 * - Delta while depth stays <= RECIPIENT_CHECKPOINT_INTERVAL and no mode flip.
 * - Mode flips when the other representation encodes to at most HALF the size
 *   of the current one (hysteresis; flips force a checkpoint).
 * - Checkpoint is inline when encoded bytes <= ROOM_MAX_INLINE_DESCRIPTOR_BYTES,
 *   else external with the bytes split into <= ROOM_MAX_PAGE_BYTES pages.
 * - Without a mutation the result is always a (re-)checkpoint of the current state.
 *
 * Pure: roots/member versions are computed by the caller via
 * applyDelta / stateFromCheckpoint.
 */
export function planNextDescriptor(state: RecipientState, mutation?: RecipientMutation): RecipientDescriptorPlan {
    const next: MembershipTransition = mutation
        ? transitionMembership(state, mutation.op, mutation.slot)
        : {
            assignedUntilSlot: state.assignedUntilSlot,
            explicitSlots: new Set(state.explicitSlots),
            explicitCount: state.explicitCount,
        };

    const active = recipientActiveSlots({
        mode: state.mode,
        assignedUntilSlot: next.assignedUntilSlot,
        explicitSlots: next.explicitSlots,
    });
    const explicitSorted = [...next.explicitSlots].sort((a, b) => a - b);

    const includeSlots = state.mode === RecipientMode.Include ? explicitSorted : active;
    const excludeSlots = state.mode === RecipientMode.Exclude
        ? explicitSorted
        : complementSlots(next.assignedUntilSlot, next.explicitSlots);

    const includeEnc = encodeDescriptor(includeSlots);
    const excludeEnc = encodeDescriptor(excludeSlots);
    const current = state.mode === RecipientMode.Include ? includeEnc : excludeEnc;
    const other = state.mode === RecipientMode.Include ? excludeEnc : includeEnc;

    const flip = other.bytes.length < current.bytes.length && other.bytes.length * 2 <= current.bytes.length;
    const depthExceeded = state.deltaDepth + 1 > RECIPIENT_CHECKPOINT_INTERVAL;

    if (mutation && !flip && !depthExceeded) {
        return {
            kind: "delta",
            op: mutation.op,
            slot: mutation.slot,
            // Delta headers carry no descriptor bytes; the program requires
            // their recipient_encoding to be Empty (publish_header.rs Delta
            // branch), so the mirror must not inherit the checkpoint's encoding.
            encoding: RecipientEncoding.Empty,
            mode: state.mode,
            assignedUntilSlot: next.assignedUntilSlot,
            explicitCount: next.explicitCount,
            explicitSlots: next.explicitSlots,
        };
    }

    const mode: RecipientModeId = flip
        ? (state.mode === RecipientMode.Include ? RecipientMode.Exclude : RecipientMode.Include)
        : state.mode;
    const chosen: EncodedRecipientDescriptor = flip ? other : current;
    const explicitForMode = mode === RecipientMode.Include ? includeSlots : excludeSlots;

    const base: RecipientPlanNextState = {
        mode,
        assignedUntilSlot: next.assignedUntilSlot,
        explicitCount: explicitForMode.length,
        explicitSlots: new Set(explicitForMode),
    };

    if (chosen.bytes.length <= ROOM_MAX_INLINE_DESCRIPTOR_BYTES) {
        return { kind: "inlineCheckpoint", encoding: chosen.encoding, descriptorBytes: chosen.bytes, ...base };
    }

    const pages = splitDescriptorPages(chosen.bytes);
    return {
        kind: "externalCheckpoint",
        encoding: chosen.encoding,
        descriptorBytes: chosen.bytes,
        pages,
        pagesHash: pagesChainHash(pages),
        ...base,
    };
}

function complementSlots(assignedUntilSlot: number, explicitSlots: Set<number>): number[] {
    const out: number[] = [];
    for (let slot = 1; slot <= assignedUntilSlot; slot++) {
        if (!explicitSlots.has(slot)) out.push(slot);
    }
    return out;
}

function requireMode(mode: number): RecipientModeId {
    if (mode !== RecipientMode.Include && mode !== RecipientMode.Exclude) {
        throw new Error(`invalid recipient mode ${mode}`);
    }
    return mode;
}
