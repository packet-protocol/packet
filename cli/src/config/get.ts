import { Keypair } from "@solana/web3.js";
import fs from "node:fs";
import TOML from "@iarna/toml";
import { DerivePacketClient, DerivePacketWallet } from "./client.js";
import {
  ConfigPath,
  ConfigSchemaVersion,
} from "../constants.js";
import { loadKeypairFromFile, resolveKeypairPath } from "./keypair.js";
import type { LoadOptions, OnDiskConfig, PacketCliConfig } from "./types.js";
import type { PacketClientConfig } from "xpkt-sdk";

/**
 * Load the active Packet CLI configuration
*/
export function GetUserConfig(options: LoadOptions = {}): PacketCliConfig {
  const config = readConfigSync();
  if (!config) {
    throw new Error(
      "Packet is not configured. Run `packet config init --rpc <url> --private-key <key>` " +
        "or `packet config init --rpc <url> --keypair ~/.config/solana/id.json` first."
    );
  }

  // Apply runtime overrides without persisting them.
  const effectiveRpc = options.rpcOverride ?? config.rpc;
  const effectiveConfig: OnDiskConfig = {
    ...config,
    rpc: effectiveRpc,
    photonRpc:
      options.rpcOverride && options.rpcOverride !== config.rpc
        ? {
            // If the user overrides the RPC at runtime but didn't touch
            // photon endpoints, mirror the new RPC into them. Otherwise
            // the compression endpoint would silently keep talking to
            // the old host, which is a surprising bug.
            connection: effectiveRpc,
            compressionApiEndpoint: effectiveRpc,
            proverEndpoint: effectiveRpc,
          }
        : config.photonRpc,
  };

  const keypairPath = resolveKeypairPath(
    effectiveConfig,
    options.keypairOverride
  );
  if (!keypairPath) {
    throw new Error(
      "No keypair could be found. Set one with `packet config init --private-key <key>` " +
        "or `packet config init --keypair <path>`, or set $PACKET_KEYPAIR."
    );
  }

  let keypair: Keypair;
  try {
    keypair = loadKeypairFromFile(keypairPath);
  } catch (err) {
    throw new Error(
      `Failed to load keypair from ${keypairPath}. ` +
        `${err instanceof Error ? err.message : String(err)}`
    );
  }

  const wallet = DerivePacketWallet(keypair);
  const client = DerivePacketClient(effectiveConfig, wallet);

  return {
    config: {
      rpc: effectiveConfig.rpc,
      photonRpc: effectiveConfig.photonRpc,
      cluster: effectiveConfig.cluster as PacketClientConfig["cluster"] || undefined,
    },
    keypair,
    client,
    wallet,
  };
}

// internals

/**
 * Sync read of the config file.
 */
export function readConfigSync(): OnDiskConfig | null {
  if (fs.existsSync(ConfigPath)) {
    const raw = fs.readFileSync(ConfigPath, "utf-8");
    return parseTomlSync(raw);
  }
  
  return null;
}

function parseTomlSync(raw: string): OnDiskConfig {
  const parsed = TOML.parse(raw);
  const rpc = parsed.rpc;
  if (typeof rpc !== "string" || rpc.length === 0) {
    throw new Error("Config is missing required field: rpc");
  }
  const photon = (parsed.photon_rpc as TOML.JsonMap | undefined) ?? {};
  return {
    schemaVersion:
      typeof parsed.schema_version === "number"
        ? parsed.schema_version
        : ConfigSchemaVersion,
    rpc,
    keypairPath:
      typeof parsed.keypair_path === "string" ? parsed.keypair_path : undefined,
    photonRpc: {
      connection:
        typeof photon.connection === "string" ? photon.connection : rpc,
      compressionApiEndpoint:
        typeof photon.compression_api_endpoint === "string"
          ? photon.compression_api_endpoint
          : rpc,
      proverEndpoint:
        typeof photon.prover_endpoint === "string"
          ? photon.prover_endpoint
          : rpc,
    },
    cluster: typeof parsed.cluster === "string" ? parsed.cluster : undefined,
  };
}
