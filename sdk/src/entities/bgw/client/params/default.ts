/**
 * Module-level default BGW params resolution.
 *
 * BGW params are intentionally NOT stored on PacketClient (one process can
 * serve multiple rooms with differing params). Callers either pass a
 * BgwParamsClient per call/room, or configure a process-wide default source
 * once via configureDefaultBgwParams(...) and let resolveBgwParams(...) build
 * and cache the client lazily. With nothing configured, resolveBgwParams falls
 * back to the Arweave-style default at DEFAULT_BGW_PARAMS_BASE_URL.
 */

import { BgwParamsClient } from "./index.js";
import type { BgwBinaryParamsChunkMeta } from "../../types/params.js";
import type { BgwBls12381WasmEngine } from "../../../wasm/xpkt-bgw-bls12/engine.js";
import { DEFAULT_BGW_PARAMS_BASE_URL, DEFAULT_BGW_PARAMS_CAPACITY } from "../../constants.js";

export type BgwDefaultParamsSource =
    /** Local directory containing manifest.json and chunks/*.bin (BgwParamsClient.InitLocal). */
    | { dir: string; manifestFileName?: string }
    /** Arweave-style HTTP artifact: manifest at the base URL, chunk i at `${base}/${i}`. */
    | { baseUrl: string }
    /** HTTP artifact with an explicit manifest URL. chunkUrl defaults to `chunks/${index}.bin` resolved against it. */
    | { manifestUrl: string; chunkUrl?: (meta: BgwBinaryParamsChunkMeta) => string }
    /** Fully custom loader. */
    | { loader: () => Promise<BgwParamsClient> };

let configuredSource: BgwDefaultParamsSource | undefined;
const defaultParamsCache = new Map<string, Promise<BgwParamsClient>>();

let loaderSeq = 0;
const loaderIds = new WeakMap<() => Promise<BgwParamsClient>, number>();

function sourceKey(source: BgwDefaultParamsSource): string {
    // Keyed by source identity + the compile-time default capacity, so a
    // reconfigure (or a capacity bump) never serves a stale client.
    if ("dir" in source) {
        return `dir:${source.dir}:${source.manifestFileName ?? "manifest.json"}:cap:${DEFAULT_BGW_PARAMS_CAPACITY}`;
    }
    if ("baseUrl" in source) {
        return `arweave:${source.baseUrl}:cap:${DEFAULT_BGW_PARAMS_CAPACITY}`;
    }
    if ("manifestUrl" in source) {
        return `url:${source.manifestUrl}:cap:${DEFAULT_BGW_PARAMS_CAPACITY}`;
    }
    let id = loaderIds.get(source.loader);
    if (id === undefined) {
        id = ++loaderSeq;
        loaderIds.set(source.loader, id);
    }
    return `loader:${id}:cap:${DEFAULT_BGW_PARAMS_CAPACITY}`;
}

/**
 * Configure the process-wide default BGW params source. Call once at startup.
 * Does not load anything eagerly; resolveBgwParams builds lazily.
 */
export function configureDefaultBgwParams(source: BgwDefaultParamsSource): void {
    configuredSource = source;
}

/** Test/teardown helper: forget the configured source and cached clients. */
export function resetDefaultBgwParams(): void {
    configuredSource = undefined;
    defaultParamsCache.clear();
}

/**
 * Resolve a BgwParamsClient: an explicit override always wins; otherwise the
 * configured default; otherwise the Arweave-style default at
 * DEFAULT_BGW_PARAMS_BASE_URL. The cached default binds the engine passed on
 * first resolution; BGW engines are room-agnostic and interchangeable.
 */
export async function resolveBgwParams(
    engine: BgwBls12381WasmEngine,
    override?: BgwParamsClient,
): Promise<BgwParamsClient> {
    if (override) return override;

    const source: BgwDefaultParamsSource = configuredSource ?? { baseUrl: DEFAULT_BGW_PARAMS_BASE_URL };

    const key = sourceKey(source);
    let pending = defaultParamsCache.get(key);
    if (!pending) {
        pending = buildFromSource(engine, source);
        defaultParamsCache.set(key, pending);
        // Drop failed builds so a later call can retry (e.g. transient fetch error).
        pending.catch(() => defaultParamsCache.delete(key));
    }
    return pending;
}

async function buildFromSource(engine: BgwBls12381WasmEngine, source: BgwDefaultParamsSource): Promise<BgwParamsClient> {
    if ("dir" in source) {
        return BgwParamsClient.InitLocal(engine, source.dir, source.manifestFileName);
    }
    if ("baseUrl" in source) {
        return BgwParamsClient.InitArweave(engine, source.baseUrl);
    }
    if ("manifestUrl" in source) {
        const resolveChunkUrl = source.chunkUrl
            ?? ((meta: BgwBinaryParamsChunkMeta) => new URL(`chunks/${meta.index}.bin`, source.manifestUrl).toString());
        return BgwParamsClient.InitHttp(engine, source.manifestUrl, resolveChunkUrl);
    }
    return source.loader();
}
