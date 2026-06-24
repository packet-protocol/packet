import { hex } from "../../../../../crypto/utils/hash.js";
import { BgwBls12381WasmEngine } from "../../../../wasm/xpkt-bgw-bls12/engine.js";
import type { BgwBinaryParamsManifest } from "../../../types/params.js";
import { DEFAULT_BGW_PARAMS_CAPACITY } from "../../../constants.js";
import { encodeBgwBinaryParamsChunk, makeBgwParamsId, makeChunkMeta } from "./codec.js";
import BN from "bn.js";

export type BgwParamsGeneratorProgress = {
    /** Index of the chunk that was just generated and saved. */
    chunkIndex: number;
    /** Total number of chunks that will be generated. */
    chunkCount: number;
    startPower: number;
    endPower: number;
    /** Bytes of the chunk that was just saved. */
    chunkBytes: number;
    /** Cumulative bytes saved so far. */
    totalBytes: number;
};

export type BgwParamsGeneratorArgs = {

    saveCb: (chunkIndex: number, chunkData: Uint8Array) => Promise<void>;

    /** Defaults to DEFAULT_BGW_PARAMS_CAPACITY. */
    capacity?: number;

    setupSeed: Uint8Array;

    /** Defaults to 2048 power indices per chunk. */
    chunkPowerCount?: number;

    /** Defaults to xpkt-bgw-bls12-381-v1-cap-${capacity}. */
    label?: string;

    /** Allows to reuse an already-loaded WASM backend. */
    bgw?: BgwBls12381WasmEngine;

    /** Called after each chunk is generated and saved. */
    onProgress?: (progress: BgwParamsGeneratorProgress) => void;
};

/**
 * Generates and saves global BGW params in binary chunk format. This is a costly operation that should be performed only once per capacity.
 *
 * Runtime clients load this output through BgwParamsClient. Rooms store only
 * params_id + params_root + capacity; room/admin gamma is separate and does not
 * invalidate this artifact.
 */
export class BgwParamsGenerator {
    readonly capacity: number;
    readonly setupSeed: Uint8Array;
    readonly outDir: string;
    readonly chunkPowerCount: number;
    readonly label: string;
    readonly manifestFileName: string;
    readonly chunksDirName: string;
    readonly bgw?: BgwBls12381WasmEngine;
    readonly saveCb: (chunkIndex: number, chunkData: Uint8Array) => Promise<void>;
    readonly onProgress?: (progress: BgwParamsGeneratorProgress) => void;

    constructor(args: BgwParamsGeneratorArgs) {
        if (args.setupSeed.length < 32) throw new Error(`setupSeed must be at least 32 bytes, got ${args.setupSeed.length}`);

        this.capacity = args.capacity ?? DEFAULT_BGW_PARAMS_CAPACITY;
        this.onProgress = args.onProgress;
        this.setupSeed = new Uint8Array(args.setupSeed);
        this.chunkPowerCount = args.chunkPowerCount ?? 2048;
        this.label = args.label ?? `xpkt-bgw-bls12-381-v1-cap-${this.capacity}`;
        this.bgw = args.bgw;
        this.saveCb = args.saveCb;
    }

    async generateAndSave(): Promise<BgwBinaryParamsManifest> {
        const bgw = this.bgw ?? await BgwBls12381WasmEngine.load();
        const capacity = this.capacity;
        const maxPower = capacity * 2;

        const setupSecret = bgw.deriveAdminSecret(this.setupSeed, new BN(capacity));
        const params = bgw.setupPublicParams(setupSecret);
        const paramsRoot = bgw.paramsRoot(params);
        const paramsId = makeBgwParamsId({
            curve: "bls12-381",
            capacity,
            paramsRoot,
            label: this.label,
        });

        const chunks: BgwBinaryParamsManifest["chunks"] = [];
        const chunkCount = Math.ceil(maxPower / this.chunkPowerCount);
        let totalBytes = 0;

        for (let startPower = 1, chunkIndex = 0; startPower <= maxPower; startPower += this.chunkPowerCount, chunkIndex++) {
            const endPower = Math.min(maxPower, startPower + this.chunkPowerCount - 1);

            // G1 prefix covers public power indices 1..2N. Index N+1 is intentionally
            // empty/identity in the params and remains zero in prefix math.
            const g1Powers: Uint8Array[] = [];
            for (let p = startPower; p <= endPower; p++) g1Powers.push(pointAt(params.g1Powers, p));
            const g1Prefix = bgw.prefixG1Powers(g1Powers).slice(1);

            // G2 only exists for 1..N.
            const g2End = Math.min(endPower, capacity);
            const g2Powers: Uint8Array[] = [];
            if (startPower <= g2End) {
                for (let p = startPower; p <= g2End; p++) g2Powers.push(pointAt(params.g2Powers, p));
            }
            const g2Prefix = g2Powers.length ? bgw.prefixG2Powers(g2Powers).slice(1) : [];

            const bytes = encodeBgwBinaryParamsChunk({
                index: chunkIndex,
                startPower,
                endPower,
                capacity,
                chunkPowerCount: this.chunkPowerCount,
                g1Prefix,
                g2Prefix,
            });

            await this.saveCb(chunkIndex, bytes);

            totalBytes += bytes.length;

            this.onProgress?.({
                chunkIndex,
                chunkCount,
                startPower,
                endPower,
                chunkBytes: bytes.length,
                totalBytes,
            });

            chunks.push(makeChunkMeta({
                index: chunkIndex,
                startPower,
                endPower,
                bytes,
                g1PrefixCount: g1Prefix.length,
                g2PrefixCount: g2Prefix.length,
            }));
        }

        const manifest: BgwBinaryParamsManifest = {
            schema: "xpkt-bgw-binary-params-v1",
            curve: "bls12-381",
            format: "prefix-only-v1",
            capacity,
            maxPower,
            chunkPowerCount: this.chunkPowerCount,
            paramsId: hex(paramsId),
            paramsRoot: hex(paramsRoot),
            label: this.label,
            generatedAt: new Date().toISOString(),
            pointBytes: { g1Compressed: 48, g2Compressed: 96 },
            chunks,
        };

        return manifest;
    }
}

function pointAt(values: Uint8Array[], index: number): Uint8Array {
    const value = values[index];
    return value ? new Uint8Array(value) : new Uint8Array();
}