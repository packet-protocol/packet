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
