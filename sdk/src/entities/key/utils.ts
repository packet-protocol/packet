import {
    AsymmetricEncryptionAlgorithm,
    type PacketReaderInput,
} from "../../crypto/index.js";
import { PacketKeyType, type PacketKeyTypeInput, type UserDecryptionKey } from "./types.js";

export function keyTypeToAnchor(keyType: PacketKeyTypeInput): any {
    if (typeof keyType === "object" && "other" in keyType) {
        return {
            other: [keyType.other],
        };
    }

    switch (keyType) {
        case PacketKeyType.X25519:
        case "x25519":
            return { x25519: {} };

        case PacketKeyType.Secp256k1:
        case "secp256k1":
            return { secp256k1: {} };

        case PacketKeyType.Ed25519WalletDerivedX25519:
        case "ed25519WalletDerivedX25519":
            return { ed25519WalletDerivedX25519: {} };

        default:
            throw new Error(`Unsupported key type: ${String(keyType)}`);
    }
}

export function anchorKeyTypeToPacketKeyType(value: any): PacketKeyTypeInput {
    if (!value) {
        return PacketKeyType.Ed25519WalletDerivedX25519;
    }

    if ("x25519" in value) {
        return PacketKeyType.X25519;
    }

    if ("secp256k1" in value) {
        return PacketKeyType.Secp256k1;
    }

    if ("ed25519WalletDerivedX25519" in value) {
        return PacketKeyType.Ed25519WalletDerivedX25519;
    }

    if ("other" in value) {
        const raw = value.other;
        const code = Array.isArray(raw) ? raw[0] : raw;

        return {
            other: Number(code),
        };
    }

    throw new Error(`Unknown on-chain key type: ${JSON.stringify(value)}`);
}

export function keyTypeToReaderAlgorithm(
    keyType: PacketKeyTypeInput,
): AsymmetricEncryptionAlgorithm {
    if (typeof keyType === "object" && "other" in keyType) {
        throw new Error("Cannot convert custom key type to reader algorithm");
    }

    switch (keyType) {
        case PacketKeyType.X25519:
        case "x25519":
            return AsymmetricEncryptionAlgorithm.X25519;

        case PacketKeyType.Ed25519WalletDerivedX25519:
        case "ed25519WalletDerivedX25519":
            return AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519;

        case PacketKeyType.Secp256k1:
        case "secp256k1":
            throw new Error("Secp256k1 reader algorithm is not wired in crypto suite yet");

        default:
            throw new Error(`Unsupported key type: ${String(keyType)}`);
    }
}

export function userKeyToReader(key: UserDecryptionKey): PacketReaderInput {
    return {
        ownerWallet: key.owner.toBase58(),
        keyAlg: keyTypeToReaderAlgorithm(key.keyType),
        publicKey: key.key,
    };
}