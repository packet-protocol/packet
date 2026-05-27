import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "node:fs";

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