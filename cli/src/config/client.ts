import { Connection, type Keypair } from "@solana/web3.js";
import {
  PacketClient,
  PacketWallet,
  type PacketClientConfig,
} from "xpkt-sdk";
import type { OnDiskConfig, PacketCliConfig } from "./types.js";

export const DerivePacketWallet = (keypair: Keypair): PacketWallet => {
  return PacketWallet.fromKeypair(keypair);
};

/**
 * Construct a PacketClient from a config payload.
 *
 * Accepts either the on-disk shape (OnDiskConfig) or the runtime
 * hydrated shape (PacketCliConfig["config"]). 
 */
export const DerivePacketClient = (
  config: OnDiskConfig | PacketCliConfig["config"],
  wallet?: PacketWallet
): PacketClient => {
  const connection = new Connection(config.rpc, "confirmed");

  const photonRpc = {
    connection: connection.rpcEndpoint,
    compressionApiEndpoint: config.photonRpc.compressionApiEndpoint,
    proverEndpoint: config.photonRpc.proverEndpoint,
  };

  return new PacketClient({
    wallet,
    connection,
    photonRpc,
    cluster: config.cluster as PacketClientConfig["cluster"] || undefined
  });
};
