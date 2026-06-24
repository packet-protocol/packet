import { Keypair, PublicKey } from "@solana/web3.js";

import {
    derivePacketEncryptionSeed,
    normalizeWalletAddress,
    type DerivePacketSeedInput,
    type DerivedPacketSeed,
} from "./seed.js";
import { AsymmetricEncryptionAlgorithm, type PacketKeyPair, type PacketReaderInput } from "../types/index.js";
import { getKeyWrapSuite } from "./suites.js";

export type PacketCryptoIdentity = {
    /**
     * Owner wallet address.
     *
     * For SOLANA-ED25519-X25519 this is normally the Solana wallet pubkey.
     */
    ownerWallet: PublicKey | string;

    /**
     * Key universe.
     *
     * SOLANA-ED25519-X25519:
     *   publicKey = Solana Ed25519 wallet public key
     *   privateKey = Ed25519 seed or Solana/tweetnacl secretKey
     *
     * X25519:
     *   publicKey = X25519 public key
     *   privateKey = X25519 private key
     */
    keyAlg: AsymmetricEncryptionAlgorithm;
    keyPair: PacketKeyPair;
};

export type PacketDerivedCryptoIdentity = {
    identity: PacketCryptoIdentity;
    seed: DerivedPacketSeed;
};

export function packetReaderFromIdentity(
    identity: PacketCryptoIdentity,
): PacketReaderInput {
    return {
        ownerWallet: normalizeWalletAddress(identity.ownerWallet),
        keyAlg: identity.keyAlg,
        publicKey: identity.keyPair.publicKey,
    };
}

export function solanaIdentityFromKeypair(
    wallet: Keypair,
): PacketCryptoIdentity {
    return {
        ownerWallet: wallet.publicKey,
        keyAlg: AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519,
        keyPair: {
            publicKey: wallet.publicKey.toBytes(),
            privateKey: wallet.secretKey,
        },
    };
}

export function x25519IdentityFromSeed(input: {
    ownerWallet: PublicKey | string;
    seed: Uint8Array;
}): PacketCryptoIdentity {
    const suite = getKeyWrapSuite(AsymmetricEncryptionAlgorithm.X25519);
    const keyPair = suite.generateKeyPairFromSeed(input.seed);

    return {
        ownerWallet: input.ownerWallet,
        keyAlg: AsymmetricEncryptionAlgorithm.X25519,
        keyPair,
    };
}

export function x25519IdentityFromKeyPair(input: {
    ownerWallet: PublicKey | string;
    keyPair: PacketKeyPair;
}): PacketCryptoIdentity {
    return {
        ownerWallet: input.ownerWallet,
        keyAlg: AsymmetricEncryptionAlgorithm.X25519,
        keyPair: input.keyPair,
    };
}

export async function x25519IdentityFromWalletPassword(
    input: DerivePacketSeedInput,
): Promise<PacketDerivedCryptoIdentity> {
    const seed = await derivePacketEncryptionSeed(input);

    return {
        seed,
        identity: x25519IdentityFromSeed({
            ownerWallet: input.walletAddress,
            seed: seed.seed,
        }),
    };
}