import { Uploader } from "@irys/upload";
import UploaderSolana from "@irys/upload-solana";
import { Keypair } from "@solana/web3.js";
import type { PacketCliConfig } from "../config/types.js";

export const IRYS_GATEWAY = "https://gateway.irys.xyz";
export const FREE_UPLOAD_SAFE_BYTES = 95 * 1024;

export const getIrysUploader = async (keypair: Keypair, config: PacketCliConfig["config"]) => {
  const uploader = Uploader(UploaderSolana as any)
    .withWallet(keypair.secretKey)
    .withRpc(config.rpc);

  if (config.cluster === "devnet") {
    uploader.devnet();
  } else {
    uploader.mainnet();
  }

  return uploader;
};

export const getFreeIrysUploader = async (config: PacketCliConfig["config"]) => {
  const keypair = Keypair.generate();
  const uploader = Uploader(UploaderSolana as any)
    .withWallet(keypair.secretKey)
    .withRpc(config.rpc);

  if (config.cluster === "devnet") {
    uploader.devnet();
  } else {
    uploader.mainnet();
  }

  return uploader;
};

export async function uploadToIrys(params: {
  keypair: Keypair,
  config: PacketCliConfig["config"],
  payload: string |  Buffer<ArrayBufferLike>;
  contentType?: string;
  preferFree?: boolean;
}): Promise<{ id: string; url: string; bytes: number; usedFreeWallet: boolean }> {
  const bytes = typeof params.payload === "string"
    ? new TextEncoder().encode(params.payload).byteLength
    : params.payload.byteLength;
  const useFree = (params.preferFree ?? true) && bytes <= FREE_UPLOAD_SAFE_BYTES;

  let uploader: Awaited<ReturnType<typeof getIrysUploader>>;
  let usedFreeWallet = false;

  if (useFree) {
    try {
      uploader = await getFreeIrysUploader(params.config);
      usedFreeWallet = true;
    } catch (err) {
      console.warn("Free Irys uploader failed, falling back to connected wallet", err);
      uploader = await getIrysUploader(params.keypair, params.config);
    }
  } else {
    uploader = await getIrysUploader(params.keypair, params.config);
  }

  const res = await uploader.upload(params.payload, {
    tags: [{ name: "Content-Type", value: params.contentType ?? "application/json" }],
  });

  return {
    id: res.id,
    url: `${IRYS_GATEWAY}/${res.id}`,
    bytes,
    usedFreeWallet,
  };
}
