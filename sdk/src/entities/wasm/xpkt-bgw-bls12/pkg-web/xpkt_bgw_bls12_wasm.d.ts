/* tslint:disable */
/* eslint-disable */

export function wasm_aggregate_g1_flat(flat: Uint8Array): Uint8Array;

export function wasm_aggregate_g1_signed(add_flat: Uint8Array, sub_flat: Uint8Array): Uint8Array;

export function wasm_aggregate_g2_flat(flat: Uint8Array): Uint8Array;

export function wasm_aggregate_g2_signed(add_flat: Uint8Array, sub_flat: Uint8Array): Uint8Array;

export function wasm_decapsulate_epoch_key(args: any): Uint8Array;

export function wasm_decapsulate_epoch_key_flat(args: any): Uint8Array;

export function wasm_derive_admin_secret(seed: Uint8Array, capacity: string): any;

export function wasm_derive_room_public_key(admin_secret: any): Uint8Array;

export function wasm_encapsulate_epoch_key(args: any): any;

export function wasm_encapsulate_epoch_key_flat(args: any): any;

export function wasm_extract_user_secret(admin_secret: any, slot: string): any;

export function wasm_extract_user_secret_from_g1_power(admin_secret: any, slot: string, p1_slot_g1: Uint8Array): any;

export function wasm_params_root(params: any): Uint8Array;

export function wasm_prefix_g1_powers(powers: any): any;

export function wasm_prefix_g2_powers(powers: any): any;

export function wasm_setup_public_params(admin_secret: any): any;

export function xpkt_bgw_backend_status(): string;

export function xpkt_bgw_curve_id(): string;

export function xpkt_bgw_scheme_id(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly wasm_aggregate_g1_flat: (a: number, b: number) => [number, number, number, number];
    readonly wasm_aggregate_g1_signed: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly wasm_aggregate_g2_flat: (a: number, b: number) => [number, number, number, number];
    readonly wasm_aggregate_g2_signed: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly wasm_decapsulate_epoch_key: (a: any) => [number, number, number, number];
    readonly wasm_decapsulate_epoch_key_flat: (a: any) => [number, number, number, number];
    readonly wasm_derive_admin_secret: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly wasm_derive_room_public_key: (a: any) => [number, number, number, number];
    readonly wasm_encapsulate_epoch_key: (a: any) => [number, number, number];
    readonly wasm_encapsulate_epoch_key_flat: (a: any) => [number, number, number];
    readonly wasm_extract_user_secret: (a: any, b: number, c: number) => [number, number, number];
    readonly wasm_extract_user_secret_from_g1_power: (a: any, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly wasm_params_root: (a: any) => [number, number, number, number];
    readonly wasm_prefix_g1_powers: (a: any) => [number, number, number];
    readonly wasm_prefix_g2_powers: (a: any) => [number, number, number];
    readonly wasm_setup_public_params: (a: any) => [number, number, number];
    readonly xpkt_bgw_backend_status: () => [number, number];
    readonly xpkt_bgw_curve_id: () => [number, number];
    readonly xpkt_bgw_scheme_id: () => [number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
