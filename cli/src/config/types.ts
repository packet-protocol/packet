import type { Keypair } from "@solana/web3.js";
import type { PacketClient, PacketClientConfig, PacketWallet } from "xpkt-sdk";

/**
 * The on-disk configuration shape.
 */
export interface OnDiskConfig {
  schemaVersion: number;

  rpc: string;

  keypairPath?: string;

  photonRpc: {
    connection: string;
    compressionApiEndpoint: string;
    proverEndpoint: string;
  };
  cluster?: string;
}

/**
 * The hydrated config returned to commands - config + a ready-to-use
 * Keypair, PacketClient, and PacketWallet.
 */
export interface PacketCliConfig {
  config: {
    rpc: string;
    photonRpc: {
      connection: string;
      compressionApiEndpoint: string;
      proverEndpoint: string;
    };
    cluster?: PacketClientConfig["cluster"];
  };
  keypair: Keypair;
  client: PacketClient;
  wallet: PacketWallet;
}

/**
 * Options the loader accepts to override config resolution at runtime.
 */
export interface LoadOptions {
  /** Override the keypair file path for this invocation only. */
  keypairOverride?: string;
  /** Override the RPC URL for this invocation only. */
  rpcOverride?: string;
}
