import type { BgwBls12381WasmEngine } from "../../../wasm/xpkt-bgw-bls12/engine";
import type { BgwBinaryParamsChunkMeta, BgwBinaryParamsManifest, BgwDecapsulateSparseMaterial, BgwEncapsulateSparseMaterial, BgwParamsChunkLoader, BgwParamsManifestLoader, BgwRangeMaterial, BgwRecipientPlan, DecodedBgwBinaryParamsChunk } from "../../types/params";
import { hex, hexToBytes } from "../../../../crypto/utils/hash";
import { sha256 } from "@noble/hashes/sha2";
import { pushNonEmpty, requireSlot, uniqueSorted } from "../../utils";
import { chunkIndexForPower, decodeBgwBinaryParamsChunk } from "./gen/codec";
import { concatBytes2, toBN } from "../../../../utils/bytes";
import BN from "bn.js";

// node:fs / node:path are imported lazily inside InitLocal only so the module
// stays importable in browser bundles; a top-level node import breaks them.
async function nodeFs() {
    return await import("node:fs/promises");
}
async function nodePath() {
    return await import("node:path");
}

export class BgwParamsClient {

    private manifestPromise?: Promise<BgwBinaryParamsManifest>;
    private readonly chunkCache = new Map<number, Promise<DecodedBgwBinaryParamsChunk>>();

    private constructor(
        readonly bgw: BgwBls12381WasmEngine,
        private readonly loadManifestFn: BgwParamsManifestLoader,
        private readonly loadChunkFn: BgwParamsChunkLoader,
        private readonly cacheChunks: boolean = true,
    ) { }

    static InitLocal(
        bgw: BgwBls12381WasmEngine,
        /** Directory containing manifest.json and chunks/*.bin. */
        dir: string,
        /** Defaults to manifest.json. */
        manifestFileName?: string,
        resolveChunkPath?: (meta: BgwBinaryParamsChunkMeta) => string,
        cacheChunks?: boolean
    ): BgwParamsClient {
        manifestFileName = manifestFileName ?? "manifest.json";
        const loadManifest = async (): Promise<BgwBinaryParamsManifest> => {
            const { readFile } = await nodeFs();
            const { join } = await nodePath();
            const raw = await readFile(join(dir, manifestFileName), "utf8");
            return JSON.parse(raw) as BgwBinaryParamsManifest;
        };

        const loadChunk = async ({ meta }: { manifest: BgwBinaryParamsManifest; meta: BgwBinaryParamsChunkMeta }): Promise<Uint8Array> => {
            const { readFile } = await nodeFs();
            const { join } = await nodePath();
            const path = resolveChunkPath ? resolveChunkPath(meta) : join(dir, "chunks", `${meta.index}.bin`);
            return new Uint8Array(await readFile(path));
        };

        return new BgwParamsClient(
            bgw,
            loadManifest,
            loadChunk,
            cacheChunks,
        );
    }

    /**
     * HTTP-hosted params artifact: fetches the manifest and chunk binaries via
     * fetch(). Chunk integrity (byteLength + sha256 chunkHash) is verified by
     * the shared loadRawChunk path, exactly like InitLocal.
     */
    static InitHttp(
        bgw: BgwBls12381WasmEngine,
        manifestUrl: string,
        resolveChunkUrl: (meta: BgwBinaryParamsChunkMeta) => string,
        cacheChunks?: boolean
    ): BgwParamsClient {
        const loadManifest = async (): Promise<BgwBinaryParamsManifest> => {
            const res = await fetch(manifestUrl);
            if (!res.ok) {
                throw new Error(`failed to fetch BGW params manifest ${manifestUrl}: ${res.status} ${res.statusText}`);
            }
            return await res.json() as BgwBinaryParamsManifest;
        };

        const loadChunk = async ({ meta }: { manifest: BgwBinaryParamsManifest; meta: BgwBinaryParamsChunkMeta }): Promise<Uint8Array> => {
            const url = resolveChunkUrl(meta);
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`failed to fetch BGW params chunk ${meta.index} from ${url}: ${res.status} ${res.statusText}`);
            }
            return new Uint8Array(await res.arrayBuffer());
        };

        return new BgwParamsClient(
            bgw,
            loadManifest,
            loadChunk,
            cacheChunks,
        );
    }

    /**
     * HTTP-hosted artifact served as an Arweave path manifest: the base URL
     * resolves to the manifest and `${base}/${index}` resolves to each chunk.
     */
    static InitArweave(
        bgw: BgwBls12381WasmEngine,
        baseUrl: string,
        cacheChunks?: boolean
    ): BgwParamsClient {
        const base = baseUrl.replace(/\/+$/, "");
        return BgwParamsClient.InitHttp(
            bgw,
            base,
            (meta) => `${base}/${meta.index}`,
            cacheChunks,
        );
    }

    async getManifest(): Promise<BgwBinaryParamsManifest> {
        this.manifestPromise ??= (async () => {
            const manifest = await this.loadManifestFn();
            return manifest;
        })();
        return this.manifestPromise;
    }

    async getChunks(): Promise<Uint8Array[]> {
        const manifest = await this.getManifest();
        return Promise.all(manifest.chunks.map((meta) => this.loadRawChunk(manifest, meta)));
    }

    async getCapacity(): Promise<BN> {
        return new BN((await this.getManifest()).capacity);
    }

    async getParamsRoot(): Promise<Uint8Array> {
        return hexToBytes((await this.getManifest()).paramsRoot);
    }

    async getParamsId(): Promise<Uint8Array> {
        return hexToBytes((await this.getManifest()).paramsId);
    }

    /**
     * Picks the cheaper of include/exclude representation for KEM material.
     *
     * include mode: `slots` are the active recipients. `assignedUntilSlot` is
     * returned as 0 on purpose — getEncapsulateMaterial/getDecapsulateMaterial
     * ignore it in include mode (the recipient set is fully described by
     * `slots`); only exclude mode consumes assignedUntilSlot.
     * exclude mode: `slots` are the removed slots within 1..assignedUntilSlot.
     */
    chooseRecipientPlan(args: { assignedUntilSlot: BN | number; activeSlots: (BN | number)[] }): BgwRecipientPlan {
        const assignedUntil = toBN(args.assignedUntilSlot).toNumber();
        const active = uniqueSorted(args.activeSlots.map((slot) => toBN(slot).toNumber()));
        const activeSet = new Set(active);
        const removed: number[] = [];
        for (let slot = 1; slot <= assignedUntil; slot++) {
            if (!activeSet.has(slot)) removed.push(slot);
        }
        if (active.length <= removed.length) {
            return { mode: "include", assignedUntilSlot: new BN(0), slots: active.map((slot) => new BN(slot)) };
        }
        return { mode: "exclude", assignedUntilSlot: new BN(assignedUntil), slots: removed.map((slot) => new BN(slot)) };
    }

    private async loadRawChunk(manifest: BgwBinaryParamsManifest, meta: BgwBinaryParamsChunkMeta): Promise<Uint8Array> {
        const bytes = await this.loadChunkFn({ manifest, meta });
        if (bytes.length !== meta.byteLength) {
            throw new Error(`BGW params chunk ${meta.index} byteLength mismatch: expected ${meta.byteLength}, got ${bytes.length}`);
        }
        const actualHash = hex(sha256(bytes));
        if (actualHash !== meta.chunkHash) {
            throw new Error(`BGW params chunk ${meta.index} hash mismatch`);
        }
        return bytes;
    }

    private async loadChunk(index: number): Promise<DecodedBgwBinaryParamsChunk> {
        if (this.cacheChunks) {
            const cached = this.chunkCache.get(index);
            if (cached) return cached;
        }

        const loadPromise = (async () => {
            const manifest = await this.getManifest();
            const meta = manifest.chunks[index];
            if (!meta) throw new Error(`BGW params chunk ${index} missing from manifest`);

            const bytes = await this.loadRawChunk(manifest, meta);
            const decoded = decodeBgwBinaryParamsChunk(bytes);
            if (decoded.index !== meta.index || decoded.startPower !== meta.startPower || decoded.endPower !== meta.endPower) {
                throw new Error(`BGW params chunk ${index} metadata mismatch`);
            }
            if (decoded.capacity !== manifest.capacity || decoded.chunkPowerCount !== manifest.chunkPowerCount) {
                throw new Error(`BGW params chunk ${index} manifest mismatch`);
            }
            return decoded;
        })();

        if (this.cacheChunks) this.chunkCache.set(index, loadPromise);
        return loadPromise;
    }

    private async getG1RangeMaterial(startPower: BN, endPower: BN): Promise<BgwRangeMaterial> {
        if (endPower.lt(startPower)) return { add: [], sub: [] };
        const manifest = await this.getManifest();
        if (startPower.lte(new BN(0)) || endPower.gt(new BN(manifest.maxPower))) throw new Error(`bad G1 range ${startPower}..${endPower}`);

        const add: Uint8Array[] = [];
        const sub: Uint8Array[] = [];
        let cursor = startPower;
        while (cursor.lte(endPower)) {
            const index = chunkIndexForPower(manifest, cursor);
            const chunk = await this.loadChunk(index);
            const segStart = cursor;
            const segEnd = BN.min(endPower, new BN(chunk.endPower));
            const startLocal = segStart.sub(new BN(chunk.startPower));
            const endLocal = segEnd.sub(new BN(chunk.startPower));

            pushNonEmpty(add, chunk.g1Prefix[endLocal.toNumber()]);
            if (startLocal.gt(new BN(0))) pushNonEmpty(sub, chunk.g1Prefix[startLocal.sub(new BN(1)).toNumber()]);
            cursor = segEnd.add(new BN(1));
        }
        return { add, sub };
    }

    private async getG2RangeMaterial(startPower: BN, endPower: BN): Promise<BgwRangeMaterial> {
        if (endPower.lt(startPower)) return { add: [], sub: [] };
        const manifest = await this.getManifest();
        if (startPower.lte(new BN(0)) || endPower.gt(new BN(manifest.capacity))) throw new Error(`bad G2 range ${startPower}..${endPower}`);

        const add: Uint8Array[] = [];
        const sub: Uint8Array[] = [];
        let cursor = startPower;
        while (cursor.lte(endPower)) {
            const index = chunkIndexForPower(manifest, cursor);
            const chunk = await this.loadChunk(index);
            const segStart = cursor;
            const segEnd = BN.min(BN.min(endPower, new BN(chunk.endPower)), new BN(manifest.capacity));
            const startLocal = segStart.sub(new BN(chunk.startPower));
            const endLocal = segEnd.sub(new BN(chunk.startPower));

            pushNonEmpty(add, chunk.g2Prefix[endLocal.toNumber()]);
            if (startLocal.gt(new BN(0))) pushNonEmpty(sub, chunk.g2Prefix[startLocal.sub(new BN(1)).toNumber()]);
            cursor = segEnd.add(new BN(1));
        }
        return { add, sub };
    }

    private async materializeG1Range(startPower: BN, endPower: BN): Promise<Uint8Array> {
        const range = await this.getG1RangeMaterial(startPower, endPower);
        return this.bgw.aggregateG1Signed(concatBytes2(range.add), concatBytes2(range.sub));
    }

    private async materializeG2Range(startPower: BN, endPower: BN): Promise<Uint8Array> {
        const range = await this.getG2RangeMaterial(startPower, endPower);
        return this.bgw.aggregateG2Signed(concatBytes2(range.add), concatBytes2(range.sub));
    }

    async getG1(powerIndex: BN | number): Promise<Uint8Array> {
        const index = toBN(powerIndex);
        const manifest = await this.getManifest();
        if (index.eq(new BN(manifest.capacity).add(new BN(1)))) {
            throw new Error("G1[n+1] is intentionally omitted from BGW public params");
        }
        return this.materializeG1Range(index, index);
    }

    async getG2(powerIndex: BN | number): Promise<Uint8Array> {
        const index = toBN(powerIndex);
        return this.materializeG2Range(index, index);
    }

    /**
     * Single G1 power P1[slot] — the public material the admin combines with
     * the room secret to extract a member's BGW user secret.
     */
    async getUserSecretMaterial(slot: BN | number): Promise<Uint8Array> {
        const s = toBN(slot);
        const manifest = await this.getManifest();
        requireSlot(new BN(manifest.capacity), s);
        return this.getG1(s);
    }

    async getEncapsulateMaterial(plan: BgwRecipientPlan): Promise<BgwEncapsulateSparseMaterial> {
        const manifest = await this.getManifest();
        const n = new BN(manifest.capacity);
        const p1NG1 = await this.getG1(n);
        const p21G2 = await this.getG2(new BN(1));
        const add: Uint8Array[] = [];
        const sub: Uint8Array[] = [];

        if (plan.mode === "include") {
            for (const slot of plan.slots) {
                requireSlot(n, slot);
                const range = await this.getG2RangeMaterial(n.add(new BN(1)).sub(slot), n.add(new BN(1)).sub(slot));
                add.push(...range.add);
                sub.push(...range.sub);
            }
        } else {
            if (plan.assignedUntilSlot.lte(new BN(0)) || plan.assignedUntilSlot.gt(n)) {
                throw new Error(`bad assignedUntilSlot ${plan.assignedUntilSlot}`);
            }
            const range = await this.getG2RangeMaterial(n.add(new BN(1)).sub(new BN(plan.assignedUntilSlot)), n);
            add.push(...range.add);
            sub.push(...range.sub);
            for (const slot of plan.slots) { 
                requireSlot(n, slot);
                const excluded = await this.getG2RangeMaterial(n.add(new BN(1)).sub(slot), n.add(new BN(1)).sub(slot));
                sub.push(...excluded.add);
                add.push(...excluded.sub);
            }
        }

        return {
            p1NG1,
            p21G2,
            c1G2AddFlat: concatBytes2(add),
            c1G2SubFlat: concatBytes2(sub),
        };
    }

    async getDecapsulateMaterial(args: { plan: BgwRecipientPlan; userSlot: BN | number }): Promise<BgwDecapsulateSparseMaterial> {
        const manifest = await this.getManifest();
        const n = new BN(manifest.capacity);
        const i = toBN(args.userSlot);
        requireSlot(n, i);

        const p1IG1 = await this.getG1(i);
        const add: Uint8Array[] = [];
        const sub: Uint8Array[] = [];

        if (args.plan.mode === "include") {
            for (const slot of args.plan.slots) {
                requireSlot(n, slot);
                if (slot.eq(i)) continue;
                const idx = n.add(new BN(1)).sub(slot).add(i);
                const range = await this.getG1RangeMaterial(idx, idx);
                add.push(...range.add);
                sub.push(...range.sub);
            }
        } else {
            const m = new BN(args.plan.assignedUntilSlot);
            if (m.lte(new BN(0)) || m.gt(n)) throw new Error(`bad assignedUntilSlot ${m.toString()}`);
            if (i.gt(m)) throw new Error(`user slot ${i.toString()} is outside exclude-mode assigned range 1..${m.toString()}`);

            // S = [1..m] \ excluded, denominator maps j -> P1[n + 1 - j + i], skipping j=i.
            // That becomes two contiguous ranges around omitted P1[n+1]:
            //   left:  P1[n+1+i-m .. n]
            //   right: P1[n+2 .. n+i]
            const left = await this.getG1RangeMaterial(n.add(new BN(1)).add(i).sub(m), n);
            const right = await this.getG1RangeMaterial(n.add(new BN(2)), n.add(i));
            add.push(...left.add, ...right.add);
            sub.push(...left.sub, ...right.sub);

            for (const slot of args.plan.slots) {
                requireSlot(n, slot);
                if (slot.eq(i)) continue;
                const idx = n.add(new BN(1)).sub(slot).add(i);
                const excluded = await this.getG1RangeMaterial(idx, idx);
                sub.push(...excluded.add);
                add.push(...excluded.sub);
            }
        }

        return {
            p1IG1,
            denomG1AddFlat: concatBytes2(add),
            denomG1SubFlat: concatBytes2(sub),
        };
    }

}