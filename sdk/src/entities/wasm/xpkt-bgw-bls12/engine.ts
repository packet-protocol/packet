import BN from "bn.js";
import { randomBytes } from "@noble/hashes/utils";
import type {
    BgwBls12381AdminSecret,
    BgwBls12381EncapsulatedEpoch,
    BgwBls12381EpochHeader,
    BgwBls12381PublicParams,
    BgwBls12381RoomPublicKey,
    BgwBls12381UserSecret,
    BgwBls12381WasmModule,
    BgwFlatDecapsulateArgs,
    BgwFlatEncapsulateArgs,
} from "./types.js";


const SCHEME_ID = "xpkt-bgw-admin-v1-bls12-381";

async function loadWasm(): Promise<BgwBls12381WasmModule> {
    try {
        // Browser / web worker → the wasm-pack `--target web` build (ESM, no node
        // `fs`). A bundler (Vite/webpack) bundles the glue and emits the `_bg.wasm`
        // asset; the default export initializes it (it locates the wasm via
        // `new URL('..._bg.wasm', import.meta.url)`, which bundlers rewrite).
        const isBrowser =
            typeof window !== "undefined" ||
            typeof (globalThis as { importScripts?: unknown }).importScripts === "function";
        if (isBrowser) {
            const mod = (await import("./pkg-web/xpkt_bgw_bls12_wasm.js")) as unknown as
                BgwBls12381WasmModule & { default: (input?: unknown) => Promise<unknown> };
            // Initialize (fetch + instantiate the wasm) before any export is called.
            await mod.default();
            return mod;
        }

        // Node → the `--target nodejs` build (CommonJS + `require('fs')`, auto-inits
        // on import). Referenced via a variable + @vite-ignore so browser bundlers
        // never try to analyze its node-only `require('fs')`/`__dirname`.
        const nodeEntry = "./pkg/xpkt_bgw_bls12_wasm.js";
        const mod = (await import(/* @vite-ignore */ nodeEntry)) as BgwBls12381WasmModule;
        return mod;
    } catch (err) {
        throw new Error(
            "BLS12-381 WASM package not found. " +
            `Original error: ${(err as Error).message}`,
        );
    }
}

function bytes(value: Uint8Array | number[] | undefined, field: string): Uint8Array {
    if (!value) throw new Error(`missing BGW field ${field}`);
    return new Uint8Array(value);
}

/** Marshal the SDK admin secret into the WASM ABI shape (u64s as strings). */
function toWasmAdminSecret(adminSecret: BgwBls12381AdminSecret): unknown {
    return {
        scheme: SCHEME_ID,
        capacity: adminSecret.capacity.toString(),
        alpha: adminSecret.alpha,
        gamma: adminSecret.gamma,
    };
}

function toWasmParams(params: BgwBls12381PublicParams): unknown {
    return {
        scheme: SCHEME_ID,
        capacity: params.capacity.toString(),
        g1Powers: params.g1Powers,
        g2Powers: params.g2Powers,
        vG2: params.vG2,
        paramsRoot: params.paramsRoot,
    };
}

function toWasmUserSecret(userSecret: BgwBls12381UserSecret): unknown {
    return {
        scheme: SCHEME_ID,
        capacity: userSecret.capacity.toString(),
        slot: userSecret.slot.toString(),
        dG1: userSecret.dG1,
    };
}

function fromWasmUserSecret(res: any): BgwBls12381UserSecret {
    return {
        slot: new BN(res.slot),
        capacity: new BN(res.capacity),
        dG1: new Uint8Array(res.dG1),
    };
}

/**
 * Raw header shape returned by the current WASM package: numeric fields are
 * decimal strings and the BGW slot root is exported under the legacy
 * `activeSetRoot` name.
 */
type WasmEpochHeaderRaw = {
    capacity: string | number;
    epoch: string | bigint;
    activeSlots: (string | number)[];
    activeSetRoot?: Uint8Array | number[];
    activeSlotsRoot?: Uint8Array | number[];
    c0G2: Uint8Array | number[];
    c1G2: Uint8Array | number[];
    epochKeyCommitment: Uint8Array | number[];
};

function normalizeWasmHeader(
    header: WasmEpochHeaderRaw,
    headerBindingRoot: Uint8Array,
): BgwBls12381EpochHeader {
    // Current Rust/WASM returns the BGW slot root as `activeSetRoot`; future
    // versions may use the corrected `activeSlotsRoot` name. Accept both.
    const activeSlotsRoot = bytes(header.activeSlotsRoot ?? header.activeSetRoot, "activeSlotsRoot");

    return {
        capacity: Number(header.capacity),
        epoch: BigInt(header.epoch),
        activeSlots: header.activeSlots.map((s) => Number(s)),
        activeSlotsRoot,
        headerBindingRoot: new Uint8Array(headerBindingRoot),

        // Deprecated alias for older code. Keep it equal to activeSlotsRoot only.
        activeSetRoot: activeSlotsRoot,

        c0G2: bytes(header.c0G2, "c0G2"),
        c1G2: bytes(header.c1G2, "c1G2"),
        epochKeyCommitment: bytes(header.epochKeyCommitment, "epochKeyCommitment"),
    };
}

/**
 * Convert the public TS header type back into the current WASM ABI shape.
 *
 * Today the Rust/WASM package expects `activeSetRoot`, so we pass the BGW slot
 * root under that legacy field name. The XPKT headerBindingRoot is not used by
 * the backend itself; it only binds the caller-supplied AAD.
 */
function toWasmHeader(header: BgwBls12381EpochHeader): unknown {
    return {
        scheme: SCHEME_ID,
        capacity: header.capacity.toString(),
        epoch: header.epoch.toString(),
        activeSlots: header.activeSlots.map((s) => s.toString()),
        activeSetRoot: header.activeSlotsRoot,
        c0G2: header.c0G2,
        c1G2: header.c1G2,
        epochKeyCommitment: header.epochKeyCommitment,
    };
}


export class BgwBls12381WasmEngine {
    readonly wasm: BgwBls12381WasmModule;

    private constructor(wasm: BgwBls12381WasmModule) {
        this.wasm = wasm;
        const scheme = wasm.xpkt_bgw_scheme_id();
        if (scheme !== SCHEME_ID) {
            throw new Error(`unexpected WASM scheme id ${scheme}`);
        }
    }

    static async load(): Promise<BgwBls12381WasmEngine> {
        return new BgwBls12381WasmEngine(await loadWasm());
    }

    status(): string {
        return this.wasm.xpkt_bgw_backend_status();
    }

    deriveAdminSecret(seed: Uint8Array, capacity: BN): BgwBls12381AdminSecret {
        const res:any = this.wasm.wasm_derive_admin_secret(seed, capacity.toString());
        return {
            capacity,
            alpha: new Uint8Array(res.alpha),
            gamma: new Uint8Array(res.gamma),
        }
    }

    deriveRoomPublicKey(adminSecret: BgwBls12381AdminSecret): BgwBls12381RoomPublicKey {
        if (!this.wasm.wasm_derive_room_public_key) throw new Error("WASM backend missing wasm_derive_room_public_key");
        return {
            capacity: adminSecret.capacity,
            vG2: new Uint8Array(this.wasm.wasm_derive_room_public_key(toWasmAdminSecret(adminSecret))),
        };
    }

    setupPublicParams(adminSecret: BgwBls12381AdminSecret): BgwBls12381PublicParams {
        const res:any = this.wasm.wasm_setup_public_params(toWasmAdminSecret(adminSecret));

        return {
            capacity: adminSecret.capacity,
            g1Powers: res.g1Powers.map((x: Uint8Array | number[]) => new Uint8Array(x)),
            g2Powers: res.g2Powers.map((x: Uint8Array | number[]) => new Uint8Array(x)),
            vG2: new Uint8Array(res.vG2),
            paramsRoot: new Uint8Array(res.paramsRoot),
        }
    }

    paramsRoot(params: BgwBls12381PublicParams): Uint8Array {
        return new Uint8Array(this.wasm.wasm_params_root(toWasmParams(params)));
    }

    extractUserSecret(adminSecret: BgwBls12381AdminSecret, slot: BN | number): BgwBls12381UserSecret {
        const res: any = this.wasm.wasm_extract_user_secret(toWasmAdminSecret(adminSecret), slot.toString());
        return fromWasmUserSecret(res);
    }

    extractUserSecretFromG1Power(adminSecret: BgwBls12381AdminSecret, slot: BN | number, p1SlotG1: Uint8Array): BgwBls12381UserSecret {
        if (!this.wasm.wasm_extract_user_secret_from_g1_power) {
            throw new Error("WASM backend missing wasm_extract_user_secret_from_g1_power");
        }
        const res: any = this.wasm.wasm_extract_user_secret_from_g1_power(
            toWasmAdminSecret(adminSecret),
            slot.toString(),
            p1SlotG1,
        );
        return fromWasmUserSecret(res);
    }

    encapsulateEpochKey(args: {
        params: BgwBls12381PublicParams;
        activeSlots: (BN | number)[];
        epoch: BN;

        /**
         * Full AAD bytes supplied to the WASM backend. The caller is
         * responsible for creating this from room id, epoch, and
         * headerBindingRoot.
         */
        aad?: Uint8Array;

        /**
         * XPKT binding root used to construct `aad`. Stored on the returned
         * header so historical reads can reconstruct the exact same AAD later
         * without relying on the current room state.
         */
        headerBindingRoot?: Uint8Array;

        tSeed?: Uint8Array;
    }): BgwBls12381EncapsulatedEpoch {
        const headerBindingRoot = args.headerBindingRoot ?? new Uint8Array();

        const res = this.wasm.wasm_encapsulate_epoch_key({
            params: toWasmParams(args.params),
            activeSlots: args.activeSlots.map((s) => s.toString()),
            epoch: args.epoch.toString(),
            aad: args.aad ?? new Uint8Array(),
            tSeed: args.tSeed ?? randomBytes(32),
        }) as { header: WasmEpochHeaderRaw; epochKey: Uint8Array | number[] };

        return {
            header: normalizeWasmHeader(res.header, headerBindingRoot),
            epochKey: bytes(res.epochKey, "epochKey"),
        };
    }

    decapsulateEpochKey(args: {
        params: BgwBls12381PublicParams;
        userSecret: BgwBls12381UserSecret;
        header: BgwBls12381EpochHeader;
        aad?: Uint8Array;
    }): Uint8Array {
        return new Uint8Array(this.wasm.wasm_decapsulate_epoch_key({
            params: toWasmParams(args.params),
            userSecret: toWasmUserSecret(args.userSecret),
            header: toWasmHeader(args.header),
            aad: args.aad ?? new Uint8Array(),
        }));
    }

    encapsulateEpochKeyFlat(args: BgwFlatEncapsulateArgs): BgwBls12381EncapsulatedEpoch {
        if (!this.wasm.wasm_encapsulate_epoch_key_flat) throw new Error("WASM backend missing wasm_encapsulate_epoch_key_flat");
        const headerBindingRoot = args.headerBindingRoot ?? new Uint8Array();

        const res = this.wasm.wasm_encapsulate_epoch_key_flat({
            capacity: args.capacity.toString(),
            recipientMode: args.recipientMode,
            assignedUntilSlot: args.assignedUntilSlot.toString(),
            recipientSlots: args.recipientSlots.map((s) => s.toString()),
            epoch: args.epoch.toString(),
            aad: args.aad ?? new Uint8Array(),
            tSeed: args.tSeed ?? randomBytes(32),
            roomVG2: args.roomVG2,
            p1NG1: args.p1NG1,
            p21G2: args.p21G2,
            c1G2AddFlat: args.c1G2AddFlat,
            c1G2SubFlat: args.c1G2SubFlat ?? new Uint8Array(),
        }) as { header: WasmEpochHeaderRaw; epochKey: Uint8Array | number[] };

        const header = normalizeWasmHeader(res.header, headerBindingRoot);
        header.recipientMode = args.recipientMode;
        header.assignedUntilSlot = args.assignedUntilSlot;
        header.recipientSlots = [...args.recipientSlots];
        header.recipientSetRoot = header.activeSlotsRoot;

        return { header, epochKey: bytes(res.epochKey, "epochKey") };
    }

    decapsulateEpochKeyFlat(args: BgwFlatDecapsulateArgs): Uint8Array {
        if (!this.wasm.wasm_decapsulate_epoch_key_flat) throw new Error("WASM backend missing wasm_decapsulate_epoch_key_flat");
        return new Uint8Array(this.wasm.wasm_decapsulate_epoch_key_flat({
            capacity: args.capacity.toString(),
            recipientMode: args.recipientMode,
            assignedUntilSlot: args.assignedUntilSlot.toString(),
            recipientSlots: args.recipientSlots.map((s) => s.toString()),
            userSecret: toWasmUserSecret(args.userSecret),
            header: toWasmHeader(args.header),
            aad: args.aad ?? new Uint8Array(),
            p1IG1: args.p1IG1,
            denomG1AddFlat: args.denomG1AddFlat,
            denomG1SubFlat: args.denomG1SubFlat ?? new Uint8Array(),
        }));
    }

    aggregateG1Signed(addFlat: Uint8Array, subFlat: Uint8Array = new Uint8Array()): Uint8Array {
        if (!this.wasm.wasm_aggregate_g1_signed) throw new Error("WASM backend missing wasm_aggregate_g1_signed");
        return new Uint8Array(this.wasm.wasm_aggregate_g1_signed(addFlat, subFlat));
    }

    aggregateG2Signed(addFlat: Uint8Array, subFlat: Uint8Array = new Uint8Array()): Uint8Array {
        if (!this.wasm.wasm_aggregate_g2_signed) throw new Error("WASM backend missing wasm_aggregate_g2_signed");
        return new Uint8Array(this.wasm.wasm_aggregate_g2_signed(addFlat, subFlat));
    }

    prefixG1Powers(powers: Uint8Array[]): Uint8Array[] {
        if (!this.wasm.wasm_prefix_g1_powers) throw new Error("WASM backend missing wasm_prefix_g1_powers");
        const result = this.wasm.wasm_prefix_g1_powers(powers) as Uint8Array[] | number[][];
        return (result as (Uint8Array | number[])[]).map((x) => new Uint8Array(x));
    }

    prefixG2Powers(powers: Uint8Array[]): Uint8Array[] {
        if (!this.wasm.wasm_prefix_g2_powers) throw new Error("WASM backend missing wasm_prefix_g2_powers");
        const result = this.wasm.wasm_prefix_g2_powers(powers) as Uint8Array[] | number[][];
        return (result as (Uint8Array | number[])[]).map((x) => new Uint8Array(x));
    }
}
