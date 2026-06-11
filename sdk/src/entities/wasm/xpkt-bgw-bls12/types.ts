import type BN from "bn.js";

export type BgwBls12381PublicParams = {
    capacity: BN;
    g1Powers: Uint8Array[];
    g2Powers: Uint8Array[];
    vG2: Uint8Array;
    paramsRoot: Uint8Array;
};

export type BgwBls12381AdminSecret = {
    capacity: BN;
    alpha: Uint8Array;
    gamma: Uint8Array;
};

export type BgwBls12381UserSecret = {
    slot: BN;
    capacity: BN;
    dG1: Uint8Array;
};

export type BgwBls12381EpochHeader = {
    capacity: number;
    epoch: bigint;
    activeSlots: number[];

    /**
     * Root/commitment over the active slot list as computed by the WASM BGW
     * backend. This is useful for debugging/auditing the slot set that was used
     * during encapsulation.
     */
    activeSlotsRoot: Uint8Array;

    /**
     * Root used by XPKT AAD binding.
     *
     * For the group-chat protocol this should be derived from the canonical
     * room/member root at publish time, e.g.
     *
     *   sha256("xpkt-bgw-header-member-root-v1", room.memberRoot)
     *
     * Historical reads MUST use this exact value again when reconstructing AAD.
     */
    headerBindingRoot: Uint8Array;

    /**
     * Deprecated compatibility alias for older code.
     *
     * This is the same value as activeSlotsRoot, not headerBindingRoot.
     * New code must not use this field for header AAD.
     */
    activeSetRoot?: Uint8Array;

    /** include/exclude recipient mode used by optimized sparse APIs. */
    recipientMode?: BgwRecipientMode;
    assignedUntilSlot?: BN;
    recipientSlots?: BN[];
    recipientSetRoot?: Uint8Array;

    c0G2: Uint8Array;
    c1G2: Uint8Array;
    epochKeyCommitment: Uint8Array;
};

export type BgwRecipientMode = "include" | "exclude";

export type BgwBls12381EncapsulatedEpoch = {
    header: BgwBls12381EpochHeader;
    epochKey: Uint8Array;
};

export type BgwBls12381RoomPublicKey = {
    capacity: BN;
    vG2: Uint8Array;
};

export type BgwFlatEncapsulateArgs = {
    capacity: BN;
    recipientMode: BgwRecipientMode;
    assignedUntilSlot: BN;
    recipientSlots: BN[];
    epoch: BN;
    aad?: Uint8Array;
    headerBindingRoot?: Uint8Array;
    tSeed?: Uint8Array;
    roomVG2: Uint8Array;
    p1NG1: Uint8Array;
    p21G2: Uint8Array;
    c1G2AddFlat: Uint8Array;
    c1G2SubFlat?: Uint8Array;
};

export type BgwFlatDecapsulateArgs = {
    capacity: BN;
    recipientMode: BgwRecipientMode;
    assignedUntilSlot: BN;
    recipientSlots: BN[];
    userSecret: BgwBls12381UserSecret;
    header: BgwBls12381EpochHeader;
    aad?: Uint8Array;
    p1IG1: Uint8Array;
    denomG1AddFlat: Uint8Array;
    denomG1SubFlat?: Uint8Array;
};

type WasmEpochHeaderLike = {
    capacity: BN;
    epoch: BN;
    activeSlots: number[];

    // Current Rust/WASM package still returns this name.
    activeSetRoot?: Uint8Array | number[];

    // Future Rust/WASM package may return the corrected name.
    activeSlotsRoot?: Uint8Array | number[];

    headerBindingRoot?: Uint8Array | number[];
    recipientMode?: BgwRecipientMode;
    assignedUntilSlot?: BN;
    recipientSlots?: BN[];
    recipientSetRoot?: Uint8Array | number[];

    c0G2: Uint8Array | number[];
    c1G2: Uint8Array | number[];
    epochKeyCommitment: Uint8Array | number[];
};

export type BgwBls12381WasmModule = {
    xpkt_bgw_curve_id(): string;
    xpkt_bgw_scheme_id(): string;
    xpkt_bgw_backend_status(): string;
    wasm_derive_admin_secret(seed: Uint8Array, capacity: string): unknown;
    wasm_setup_public_params(adminSecret: unknown): unknown;
    wasm_extract_user_secret(adminSecret: unknown, slot: string): unknown;
    wasm_encapsulate_epoch_key(args: unknown): unknown;
    wasm_decapsulate_epoch_key(args: unknown): Uint8Array;
    wasm_params_root(params: unknown): Uint8Array;

    wasm_aggregate_g1_flat?(flat: Uint8Array): Uint8Array;
    wasm_aggregate_g2_flat?(flat: Uint8Array): Uint8Array;
    wasm_aggregate_g1_signed?(addFlat: Uint8Array, subFlat: Uint8Array): Uint8Array;
    wasm_aggregate_g2_signed?(addFlat: Uint8Array, subFlat: Uint8Array): Uint8Array;
    wasm_prefix_g1_powers?(powers: Uint8Array[]): Uint8Array[] | number[][];
    wasm_prefix_g2_powers?(powers: Uint8Array[]): Uint8Array[] | number[][];
    wasm_derive_room_public_key?(adminSecret: unknown): Uint8Array;
    wasm_extract_user_secret_from_g1_power?(adminSecret: unknown, slot: string, p1SlotG1: Uint8Array): unknown;
    wasm_encapsulate_epoch_key_flat?(args: unknown): unknown;
    wasm_decapsulate_epoch_key_flat?(args: unknown): Uint8Array;
};