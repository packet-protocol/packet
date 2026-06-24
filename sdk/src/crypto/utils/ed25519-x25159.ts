import { sha512 } from "@noble/hashes/sha2";

import type { Bytes } from "../../types/common.js";

const P = (1n << 255n) - 19n;

function mod(x: bigint): bigint {
    const r = x % P;
    return r >= 0n ? r : r + P;
}

function modPow(base: bigint, exp: bigint): bigint {
    let result = 1n;
    let b = mod(base);
    let e = exp;

    while (e > 0n) {
        if (e & 1n) result = mod(result * b);
        b = mod(b * b);
        e >>= 1n;
    }

    return result;
}

function invert(x: bigint): bigint {
    if (mod(x) === 0n) {
        throw new Error("Cannot invert zero");
    }

    return modPow(x, P - 2n);
}

function bytesToBigIntLE(bytes: Bytes): bigint {
    let n = 0n;

    for (let i = 0; i < bytes.length; i++) {
        n |= BigInt(bytes[i]) << (8n * BigInt(i));
    }

    return n;
}

function bigIntTo32BytesLE(n: bigint): Bytes {
    let x = mod(n);
    const out = new Uint8Array(32);

    for (let i = 0; i < 32; i++) {
        out[i] = Number(x & 0xffn);
        x >>= 8n;
    }

    return out;
}

/**
 * Converts an Ed25519 public key to a Montgomery/X25519 public key.
 *
 * Ed25519 compressed public key:
 *   y-coordinate + x sign bit
 *
 * X25519 public key:
 *   Montgomery u-coordinate
 *
 * Formula:
 *   u = (1 + y) / (1 - y) mod p
 */
export function ed25519PublicKeyToX25519(ed25519PublicKey: Bytes): Bytes {
    if (ed25519PublicKey.length !== 32) {
        throw new Error("Ed25519 public key must be 32 bytes");
    }

    const yBytes = new Uint8Array(ed25519PublicKey);

    // Clear Edwards x sign bit.
    yBytes[31] &= 0x7f;

    const y = bytesToBigIntLE(yBytes);

    if (y >= P) {
        throw new Error("Invalid Ed25519 public key");
    }

    const denominator = mod(1n - y);

    if (denominator === 0n) {
        throw new Error("Invalid Ed25519 public key: invalid Montgomery map");
    }

    const u = mod((1n + y) * invert(denominator));

    return bigIntTo32BytesLE(u);
}

/**
 * Converts an Ed25519 secret key/seed to an X25519 private key.
 *
 * Accepts:
 * - 32-byte Ed25519 seed
 * - 64-byte Solana/tweetnacl secretKey = seed || publicKey
 *
 * This follows libsodium-style behavior:
 * for 64-byte Ed25519 secret keys, only the first 32-byte seed is used.
 */
export function ed25519SecretKeyToX25519(ed25519SecretKeyOrSeed: Bytes): Bytes {
    if (
        ed25519SecretKeyOrSeed.length !== 32 &&
        ed25519SecretKeyOrSeed.length !== 64
    ) {
        throw new Error("Ed25519 secret key must be 32-byte seed or 64-byte secretKey");
    }

    const seed =
        ed25519SecretKeyOrSeed.length === 64
            ? ed25519SecretKeyOrSeed.slice(0, 32)
            : ed25519SecretKeyOrSeed;

    const h = sha512(seed).slice(0, 32);

    // X25519 clamp.
    h[0] &= 248;
    h[31] &= 127;
    h[31] |= 64;

    return h;
}