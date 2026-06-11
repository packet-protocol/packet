import type BN from "bn.js";

export type BgwBinaryParamsSchema = "xpkt-bgw-binary-params-v1";
export type BgwBinaryParamsFormat = "prefix-only-v1";
export type BgwCurveId = "bls12-381";

export type BgwRecipientMode = "include" | "exclude";

export type BgwRecipientPlan = {
  /**
   * include: slots are active/included recipients.
   * exclude: slots are removed/excluded recipients from 1..assignedUntilSlot.
   */
  mode: BgwRecipientMode;
  assignedUntilSlot: BN;
  slots: BN[];
};

export type BgwEncapsulateSparseMaterial = {
  p1NG1: Uint8Array;
  p21G2: Uint8Array;
  c1G2AddFlat: Uint8Array;
  c1G2SubFlat: Uint8Array;
};

export type BgwDecapsulateSparseMaterial = {
  p1IG1: Uint8Array;
  denomG1AddFlat: Uint8Array;
  denomG1SubFlat: Uint8Array;
};

export type BgwBinaryParamsManifest = {
  schema: BgwBinaryParamsSchema;
  curve: BgwCurveId;
  format: BgwBinaryParamsFormat;

  /**
   * Universe size N. Valid member slots are 1..capacity.
   * Plain number: the manifest is JSON-serialized (capacity is u32-safe).
   */
  capacity: number;

  /** Highest public power index represented by the artifact. For BGW this is 2 * capacity. */
  maxPower: number;

  /** Number of BGW power indices per chunk, not number of group elements. */
  chunkPowerCount: number;

  /** Stable params id. Store raw bytes in Room.params_id. */
  paramsId: string;

  /** params root. Store raw 32 bytes in Room.params_root. */
  paramsRoot: string;

  label?: string;
  generatedAt: string;

  pointBytes: {
    g1Compressed: 48;
    g2Compressed: 96;
  };

  chunks: BgwBinaryParamsChunkMeta[];
};

export type BgwBinaryParamsChunkMeta = {
  index: number;
  startPower: number;
  endPower: number;

  byteLength: number;
  chunkHash: string;

  /** Number of stored G1 local prefix points. Normally endPower-startPower+1. */
  g1PrefixCount: number;

  /** Number of stored G2 local prefix points. Chunks beyond capacity have 0. */
  g2PrefixCount: number;
};


export type DecodedBgwBinaryParamsChunk = {
  index: number;
  startPower: number;
  endPower: number;
  capacity: number;
  chunkPowerCount: number;
  g1Prefix: Uint8Array[];
  g2Prefix: Uint8Array[];
};

export type BgwRangeMaterial = {
  add: Uint8Array[];
  sub: Uint8Array[];
};

export type BgwParamsManifestLoader = () => Promise<BgwBinaryParamsManifest>;

export type BgwParamsChunkLoader = (args: {
  manifest: BgwBinaryParamsManifest;
  meta: BgwBinaryParamsChunkMeta;
}) => Promise<Uint8Array>;