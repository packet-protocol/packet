import { writeConfig, writeWallet } from "./io.js";
import { decodeBase58Secret } from "./keypair.js";
import { ConfigSchemaVersion, WalletPath } from "../constants.js";
import type { OnDiskConfig } from "./types.js";

export interface SetUserConfigOptions {
  rpc: string;
  compressionApiEndpoint?: string;
  proverEndpoint?: string;
  keypairPath?: string;
}

/**
 * Save the user's wallet and configuration to disk.
 *
 * Two mutually exclusive modes:
 *
 *   1. `privateKey` supplied → decoded, validated, written to <config>/wallet.json
 *      with mode 0600. The config is then pinned to that path explicitly
 *      via `keypairPath`, so later runs cannot silently fall back to a
 *      different wallet (e.g. the Solana CLI default).
 *
 *   2. `keypairPath` supplied → no key material touches Packet. We just
 *      record the path in config.toml. The user keeps full control of
 *      where the key lives (Solana CLI's default, a hardware wallet
 *      shim file, etc.).
 *
 * If neither is supplied, we error out.
 */
export async function SetUserConfig(
  privateKey: string | undefined,
  options: SetUserConfigOptions
): Promise<void> {
  // Validate FIRST, build LATER
  if (!options.rpc?.trim()) {
    throw new Error("RPC URL is required. Pass --rpc <url>.");
  }

  if (!privateKey && !options.keypairPath) {
    throw new Error(
      "Must supply either --private-key <key> or --keypair <path>. " +
        "If you already have a Solana CLI keypair, pass --keypair " +
        "~/.config/solana/id.json."
    );
  }
  if (privateKey && options.keypairPath) {
    throw new Error(
      "--private-key and --keypair are mutually exclusive. Pass only one."
    );
  }

  // Decode + validate secret material BEFORE touching disk
  // This way an invalid input never produces a half-written state.
  let secretKey: Uint8Array | null = null;
  if (privateKey) {
    const keypair = decodeBase58Secret(privateKey);
    secretKey = keypair.secretKey;
  }

  const pinnedKeypairPath =
    options.keypairPath ?? (secretKey ? WalletPath : undefined);

  // Determine cluster from RPC
  var cluster: string;
  try {
    const { cluster: detectedCluster } = await getSolanaCluster(options.rpc);
    cluster = detectedCluster;
    if (cluster === "testnet"){
      console.warn("Warning: Detected testnet RPC URL. Packet is not deployed on testnet. Proceeding with cluster = 'mainnet'.");
      cluster = "mainnet";
    }
  } catch (err) {
    console.warn(
      `Warning: Failed to detect Solana cluster from RPC URL: ` +
        `${err instanceof Error ? err.message : String(err)}. ` +
        `Proceeding with cluster = "mainnet".`
    );
    cluster = "mainnet";
  }

  // Build config payload
  const config: OnDiskConfig = {
    schemaVersion: ConfigSchemaVersion,
    rpc: options.rpc,
     keypairPath: pinnedKeypairPath,
    photonRpc: {
      connection: options.rpc,
      compressionApiEndpoint: options.compressionApiEndpoint ?? options.rpc,
      proverEndpoint: options.proverEndpoint ?? options.rpc,
    },
    cluster,
  };

  // Persist 
  // Wallet first (so a config write failure doesn't leave us pointing
  // at a wallet path that's empty).
  if (secretKey) {
    try {
      await writeWallet(WalletPath, secretKey);
    } catch (err) { 
      throw new Error(
        `Failed to write wallet file: ` +
          `${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      // Best-effort: zero out the in-memory copy of the key. Node won't
      // actually scrub memory deterministically, but this prevents
      // accidental references from holding on to it.
      secretKey.fill(0);
    }
  }

  try {
    await writeConfig(config);
  } catch (err) {
    throw new Error(
      `Failed to write config file: ` +
        `${err instanceof Error ? err.message : String(err)}`
    );
  }
}

const GENESIS_HASHES: Record<string, string> = {
  "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d": "mainnet",
  "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY": "testnet",
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG": "devnet",
};

async function getSolanaCluster(rpcUrl: string) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getGenesisHash",
    }),
  });

  const json:any = await res.json();
  const genesisHash = json.result;

  var cluster = GENESIS_HASHES[genesisHash];

  if (!cluster) {
    throw new Error(`Unknown genesis hash: ${genesisHash}`);
  }

  return {
    genesisHash,
    cluster, 
  };
}