import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import {
  SolanaDefaultKeypairPath,
  WalletPath,
} from "../constants.js";
import type { OnDiskConfig } from "./types.js";

/**
 * Resolve which keypair file to load, in priority order:
 *
 *   1. Runtime override (--keypair flag)
 *   2. PACKET_KEYPAIR environment variable
 *   3. `keypair_path` in the on-disk config (explicit user choice)
 *   4. Solana CLI default (~/.config/solana/id.json) - auto-detect
 *      ONLY when the config has no explicit keypair_path. This is the
 *      first-run convenience for users who already have Solana set up.
 *   5. Packet-managed wallet (<config>/wallet.json) - same condition.
 *
 * Returns null if no keypair can be located.
 */
export function resolveKeypairPath(
  config: OnDiskConfig | null,
  runtimeOverride?: string
): string | null {
  // 1. Runtime flag
  if (runtimeOverride) return expandHome(runtimeOverride);

  // 2. Env var.
  if (process.env.PACKET_KEYPAIR) {
    return expandHome(process.env.PACKET_KEYPAIR);
  }

  // 3. Config-bound keypair path (explicit user choice - recorded by
  // `packet config` whenever the user supplied --keypair or --private-key).
  if (config?.keypairPath) {
    return expandHome(config.keypairPath);
  }

  // 4 & 5. Auto-detect fallbacks.
  if (fs.existsSync(SolanaDefaultKeypairPath)) {
    return SolanaDefaultKeypairPath;
  }
  if (fs.existsSync(WalletPath)) {
    return WalletPath;
  }

  return null;
}

/**
 * Load keypair from file.
*/
export function loadKeypairFromFile(filepath: string): Keypair {
  let raw: string;
  try {
    raw = fs.readFileSync(filepath, "utf-8");
  } catch (err) {
    throw new Error(
      `Could not read keypair at ${filepath}: ` +
      `${err instanceof Error ? err.message : String(err)}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Keypair file at ${filepath} is not valid JSON. ` +
      `Expected a 64-byte int array. ` +
      `Cause: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const secretKey = extractSecretKey(parsed);
  if (!secretKey) {
    throw new Error(
      `Keypair file at ${filepath} has unrecognized shape. Expected ` +
      `Solana CLI format ([64 bytes]).`
    );
  }

  if (secretKey.length !== 64) {
    throw new Error(
      `Keypair at ${filepath} has ${secretKey.length} bytes; expected 64. ` +
      `Did you save the public key by mistake?`
    );
  }

  try {
    return Keypair.fromSecretKey(secretKey);
  } catch (err) {
    throw new Error(
      `Keypair at ${filepath} failed Ed25519 validation: ` +
      `${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Decode and validate a base58 secret key 
 */
export function decodeBase58Secret(privateKey: string): Keypair {
  let bytes: Uint8Array;
  try {
    bytes = bs58.decode(privateKey.trim());
  } catch (err) {
    throw new Error(
      `Private key is not valid base58. ` +
      `Cause: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (bytes.length !== 64) {
    throw new Error(
      `Decoded private key is ${bytes.length} bytes; expected 64. ` +
      `Did you paste a public key by mistake?`
    );
  }

  try {
    return Keypair.fromSecretKey(bytes);
  } catch (err) {
    throw new Error(
      `Private key failed Ed25519 validation: ` +
      `${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// internals

function extractSecretKey(parsed: unknown): Uint8Array | null {
  // Solana CLI format: top-level array of numbers.
  if (Array.isArray(parsed) && parsed.every((n) => typeof n === "number")) {
    return new Uint8Array(parsed);
  }

  return null;
}

function expandHome(p: string): string {
  if (p === "~" || p.startsWith("~/") || p.startsWith("~\\")) {
    return path.join(homedir(), p.slice(2));
  }
  return p;
}
