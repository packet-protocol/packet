import TOML from "@iarna/toml";
import fs from "node:fs";
import writeFileAtomic from "write-file-atomic";
import {
  ConfigFolderPath,
  ConfigPath,
  ConfigSchemaVersion,
} from "../constants.js";
import type { OnDiskConfig } from "./types.js";

/**
 * Read the on-disk config.
 *
 * Returns null if no config exists at all (first run).
 */
export async function readConfig(): Promise<OnDiskConfig | null> {
  if (fs.existsSync(ConfigPath)) {
    const raw = await fs.promises.readFile(ConfigPath, "utf-8");
    return parseTomlConfig(raw);
  }

  return null;
}

/**
 * Atomically write the config to disk in TOML format. The wallet file
 * is handled separately by writeWallet() because it has stricter perms.
 */
export async function writeConfig(config: OnDiskConfig): Promise<void> {
  await ensureConfigDir();
  const body = toTomlString(config);
  await writeFileAtomic(ConfigPath, body, {
    mode: 0o644, // config is not secret. world-readable is fine
    encoding: "utf-8",
  });
}

/**
 * Atomically write a wallet JSON file in Solana CLI's standard format
 *
 * Modes: 0o700 on the directory, 0o600 on the file.
 * Re-chmod after writing.
 */
export async function writeWallet(
  filepath: string,
  secretKey: Uint8Array
): Promise<void> {
  await ensureConfigDir();
  const body = JSON.stringify(Array.from(secretKey));
  await writeFileAtomic(filepath, body, {
    mode: 0o600,
    encoding: "utf-8",
  });

  // Defense-in-depth: explicitly chmod regardless of what the platform
  // did with the mode option above.
  try {
    await fs.promises.chmod(filepath, 0o600);
  } catch {
    // Not all platforms support chmod meaningfully; ignore.
  }
}

// internals

async function ensureConfigDir(): Promise<void> {
  await fs.promises.mkdir(ConfigFolderPath, { recursive: true, mode: 0o700 });
  try {
    await fs.promises.chmod(ConfigFolderPath, 0o700);
  } catch {
    // Ignore on platforms where chmod is a no-op.
  }
}

/**
 * Serialize OnDiskConfig to TOML
 */
function toTomlString(config: OnDiskConfig): string {
  const header =
    "# Packet CLI configuration.\n" +
    "# Edit by hand or use `packet config` to update.\n" +
    "# Docs: https://docs.xpkt.dev\n\n";
    
  const document: Record<string, unknown> = {
    schema_version: config.schemaVersion,
    rpc: config.rpc,
    ...(config.keypairPath ? { keypair_path: config.keypairPath } : {}),
    photon_rpc: {
      connection: config.photonRpc.connection,
      compression_api_endpoint: config.photonRpc.compressionApiEndpoint,
      prover_endpoint: config.photonRpc.proverEndpoint,
    },
    cluster: config.cluster,
    ...(config.bgwParams && (config.bgwParams.dir || config.bgwParams.url)
      ? {
          bgw_params: {
            ...(config.bgwParams.dir ? { dir: config.bgwParams.dir } : {}),
            ...(config.bgwParams.url ? { url: config.bgwParams.url } : {}),
          },
        }
      : {}),
  };

  return header + TOML.stringify(document as TOML.JsonMap);
}

function parseTomlConfig(raw: string): OnDiskConfig {
  let parsed: TOML.JsonMap;
  try {
    parsed = TOML.parse(raw);
  } catch (err) {
    throw new Error(
      `Failed to parse TOML config: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const rpc = parsed.rpc;
  if (typeof rpc !== "string" || rpc.length === 0) {
    throw new Error(`Config is missing required field: rpc`);
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
    bgwParams: parseBgwParamsConfig(parsed.bgw_params),
  };
}

function parseBgwParamsConfig(value: unknown): OnDiskConfig["bgwParams"] {
  if (!value || typeof value !== "object") return undefined;
  const map = value as TOML.JsonMap;
  const dir = typeof map.dir === "string" ? map.dir : undefined;
  const url = typeof map.url === "string" ? map.url : undefined;
  if (!dir && !url) return undefined;
  return { dir, url };
}
