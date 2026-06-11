/**
 * BGW / room recipient constants.
 *
 * Mirrors the program-side constants in `state/room` — keep in sync with the
 * Rust side (see .agents/xpkt-room-impl-spec.md).
 */

/**
 * Default BGW params capacity (universe size N).
 *
 * This is the ONE variable controlling the default capacity used by the
 * params generator and the default params resolver.
 */
export const DEFAULT_BGW_PARAMS_CAPACITY = 1_048_576;

/**
 * Base URL of the default BGW params source (capacity {@link DEFAULT_BGW_PARAMS_CAPACITY}).
 * Resolves the params artifact as an Arweave path manifest: the base itself
 * returns manifest.json and `${base}/${i}` returns chunk i. Override per
 * deployment with configureDefaultBgwParams(...).
 */
export const DEFAULT_BGW_PARAMS_BASE_URL = "https://arweave.net/erEnI-MC4igmd9SpXuWmoVRiz6zfK-tVqyz5yGjmF8M";

/**
 * A Delta header may not push delta_depth past this value.
 * At depth == interval the next descriptor MUST be a checkpoint.
 */
export const RECIPIENT_CHECKPOINT_INTERVAL = 64;

/**
 * Max bytes for an inline checkpoint descriptor (program:
 * ROOM_MAX_INLINE_DESCRIPTOR_BYTES). Above this the planner routes the
 * checkpoint to the ExternalCheckpoint staged-pages path.
 *
 * An InlineCheckpoint descriptor rides inside the publish_header tx alongside
 * the ~285B KEM header, account list, compute-budget ixs and the v0/LUT message
 * (~909B fixed overhead); the 1232B raw tx limit is hit near 323 descriptor
 * bytes, so 300 leaves margin. MUST equal the program constant.
 */
export const ROOM_MAX_INLINE_DESCRIPTOR_BYTES = 300;

/**
 * Max payload bytes per staged recipient page (program: ROOM_MAX_PAGE_BYTES).
 * A stage_recipient_page tx carries no KEM bytes (~560B overhead), so the
 * limit is hit at ~672 payload bytes; 640 leaves margin. MUST equal the
 * program constant.
 */
export const ROOM_MAX_PAGE_BYTES = 640;

/** Max epoch-key chain length within one segment (key schedule). */
export const ROOM_CHAIN_MAX = 4096;

// ---------------------------------------------------------------------------
// Hash domains — recipient root chain.
// Root-chain hashing uses sha256 over concatenated slices with LITTLE-endian ints.
// ---------------------------------------------------------------------------

export const RECIPIENT_CHECKPOINT_DOMAIN = "xpkt-recipient-checkpoint-v1";
export const RECIPIENT_DELTA_DOMAIN = "xpkt-recipient-delta-v1";
export const RECIPIENT_PAGE_DOMAIN = "xpkt-recipient-page-v1";

/** Epoch header hash domain. */
export const ROOM_EPOCH_HEADER_HASH_DOMAIN = "xpkt-bgw-epoch-header-v2";

// ---------------------------------------------------------------------------
// Hash domains — key schedule.
// BGW crypto AADs / key-schedule domains use BIG-endian ints (u64be/u32be),
// unlike the recipient root chain above which uses little-endian.
// ---------------------------------------------------------------------------

export const ROOM_CHAIN_TIP_DOMAIN = "xpkt-room-chain-tip-v1";
export const ROOM_CHAIN_STEP_DOMAIN = "xpkt-room-chain-step-v1";
export const ROOM_MESSAGE_KEY_DOMAIN = "xpkt-room-message-key-v1";
export const ROOM_MESSAGE_AAD_DOMAIN = "xpkt-room-msg-v1";

/** Off-chain room body envelope: encrypted under the epoch key (single key). */
export const ROOM_BLOB_KEY_DOMAIN = "xpkt-room-blob-key-v1";
export const ROOM_BLOB_AAD_DOMAIN = "xpkt-room-blob-v1";

// ---------------------------------------------------------------------------
// Numeric enums mirrored from the program (types/room.rs, #[repr(u8)]).
// ---------------------------------------------------------------------------

export const RecipientMode = {
    Include: 0,
    Exclude: 1,
} as const;
export type RecipientModeId = (typeof RecipientMode)[keyof typeof RecipientMode];

export const RecipientDescriptorKind = {
    Reuse: 0,
    Delta: 1,
    InlineCheckpoint: 2,
    ExternalCheckpoint: 3,
} as const;
export type RecipientDescriptorKindId = (typeof RecipientDescriptorKind)[keyof typeof RecipientDescriptorKind];

export const RecipientEncoding = {
    Empty: 0,
    DeltaVarint: 1,
    Ranges: 2,
    /** Reserved. Valid id on-chain, but the TS planner/codec never emits it. */
    Bitmap: 3,
} as const;
export type RecipientEncodingId = (typeof RecipientEncoding)[keyof typeof RecipientEncoding];

export const RecipientDeltaOp = {
    None: 0,
    Activate: 1,
    Remove: 2,
} as const;
export type RecipientDeltaOpId = (typeof RecipientDeltaOp)[keyof typeof RecipientDeltaOp];
