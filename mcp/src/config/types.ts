import type { Keypair } from "@solana/web3.js";
import type { PacketClient, PacketClientConfig, PacketWallet } from "xpkt-sdk";

/**
 * The input configuration shape.
 */
export interface InputConfig {

  rpc: string;

  keypair: Keypair;

  photonRpc: {
    connection: string;
    compressionApiEndpoint: string;
    proverEndpoint: string;
  };
  cluster?: string;
  /** Optional local directory with a generated BGW params artifact (manifest.json + chunks/*.bin) for room tools. */
  bgwParamsDir?: string;
}

/**
 * The hydrated config returned to commands - config + a ready-to-use
 * Keypair, PacketClient, and PacketWallet.
 */
export interface PacketMcpConfig {
  config: {
    rpc: string;
    photonRpc: {
      connection: string;
      compressionApiEndpoint: string;
      proverEndpoint: string;
    };
    cluster?: PacketClientConfig["cluster"];
    /** Optional local directory with a generated BGW params artifact for room tools. */
    bgwParamsDir?: string;
  };
  keypair: Keypair;
  client: PacketClient;
  wallet: PacketWallet;
}