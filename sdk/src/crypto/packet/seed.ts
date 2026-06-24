import { argon2id } from "hash-wasm";
import { sha256 } from "@noble/hashes/sha2";
import { hkdf } from "@noble/hashes/hkdf";
import { PublicKey } from "@solana/web3.js";

import type { Bytes } from "../../types/common.js";
import { bytesToHex, concatBytes, utf8 } from "../../utils/index.js";

const DEFAULT_ARGON2_MEMORY_KIB = 19 * 1024;

export type PacketSignMessage = (message: Uint8Array) => Promise<Uint8Array>;

export type DerivePacketSeedInput = {
    password: string;
    walletAddress: PublicKey | string;
    signMessage: PacketSignMessage;

    origin?: string;

    argon2?: {
        parallelism?: number;
        iterations?: number;
        memorySize?: number;
        hashLength?: number;
    };
};

export type DerivedPacketSeed = {
    passwordKey: Bytes;
    pwTag: string;
    signingMessageText: string;
    signingMessageBytes: Bytes;
    signatureHash: Bytes;
    seed: Bytes;
};

export function normalizeWalletAddress(walletAddress: PublicKey | string): string {
    return walletAddress instanceof PublicKey
        ? walletAddress.toBase58()
        : walletAddress;
}

export async function derivePacketEncryptionSeed(
    input: DerivePacketSeedInput,
): Promise<DerivedPacketSeed> {
    const walletAddress = normalizeWalletAddress(input.walletAddress);

    const passwordKey = await derivePasswordKey({
        password: input.password,
        walletAddress,
        argon2: input.argon2,
    });

    const pwTag = derivePwTag(passwordKey);

    const signingMessageText = buildPacketSeedSigningMessage({
        walletAddress,
        pwTag,
        origin: input.origin ?? "packet",
    });

    const signingMessageBytes = utf8(signingMessageText);
    const signature = await input.signMessage(signingMessageBytes);
    const signatureHash = sha256(signature);

    const seed = hkdf(
        sha256,
        concatBytes(passwordKey, signatureHash),
        utf8(`packet:seed:${walletAddress}:v1`),
        utf8("packet:seed"),
        32,
    );

    return {
        passwordKey,
        pwTag,
        signingMessageText,
        signingMessageBytes,
        signatureHash,
        seed,
    };
}

export async function derivePasswordKey(input: {
    password: string;
    walletAddress: PublicKey | string;
    argon2?: DerivePacketSeedInput["argon2"];
}): Promise<Bytes> {
    const walletAddress = normalizeWalletAddress(input.walletAddress);

    const salt = utf8(`packet:argon2id:${walletAddress}:v1`);

    const out = await argon2id({
        password: input.password,
        salt,
        parallelism: input.argon2?.parallelism ?? 1,
        iterations: input.argon2?.iterations ?? 2,
        memorySize: input.argon2?.memorySize ?? DEFAULT_ARGON2_MEMORY_KIB,
        hashLength: input.argon2?.hashLength ?? 32,
        outputType: "binary",
    });

    return new Uint8Array(out);
}

export function derivePwTag(passwordKey: Bytes): string {
    const tag = hkdf(
        sha256,
        passwordKey,
        utf8("packet:pwtag:v1"),
        utf8("display"),
        8,
    );

    return bytesToHex(tag);
}

export function buildPacketSeedSigningMessage(input: {
    walletAddress: PublicKey | string;
    pwTag: string;
    origin?: string;
}): string {
    const walletAddress = normalizeWalletAddress(input.walletAddress);

    return [
        "packet derive seed v1",
        `wallet: ${walletAddress}`,
        `origin: ${input.origin ?? "packet"}`,
        `tag: ${input.pwTag}`,
        "purpose: derive encryption key",
    ].join("\n");
}
