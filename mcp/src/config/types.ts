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
  };
  keypair: Keypair;
  client: PacketClient;
  wallet: PacketWallet;
}