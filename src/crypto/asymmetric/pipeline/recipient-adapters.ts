import { x25519 } from "@noble/curves/ed25519";
import tweetnacl from "tweetnacl";

import type { Bytes } from "../../../types/common";
import type { PacketKeyPair } from "../../types/common";
import { AsymmetricEncryptionAlgorithm } from "../../types/asymmetric";
import { derive32 } from "../../utils/kdf";
import {
    ed25519PublicKeyToX25519,
    ed25519SecretKeyToX25519,
} from "../../utils/ed25519-x25159";
import type { RecipientKeyAdapter } from "./types";

export class NativeX25519RecipientKeyAdapter
    implements RecipientKeyAdapter<AsymmetricEncryptionAlgorithm.X25519> {
    readonly alg = AsymmetricEncryptionAlgorithm.X25519 as const;

    generateKeyPairFromSeed(seed: Bytes): PacketKeyPair {
        const privateKey = derive32(seed, "packet:x25519:sk:v1");
        const publicKey = x25519.getPublicKey(privateKey);

        return { privateKey, publicKey };
    }

    toAgreementPublicKey(publicKey: Bytes): Bytes {
        if (publicKey.length !== 32) {
            throw new Error("X25519 public key must be 32 bytes");
        }

        return publicKey;
    }

    toAgreementPrivateKey(privateKey: Bytes): Bytes {
        if (privateKey.length !== 32) {
            throw new Error("X25519 private key must be 32 bytes");
        }

        return privateKey;
    }
}

export class SolanaEd25519X25519RecipientKeyAdapter
    implements RecipientKeyAdapter<AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519> {
    readonly alg = AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519 as const;

    generateKeyPairFromSeed(seed: Bytes): PacketKeyPair {
        const ed25519Seed = derive32(seed, "packet:solana-ed25519:seed:v1");
        const keypair = tweetnacl.sign.keyPair.fromSeed(ed25519Seed);

        return {
            privateKey: keypair.secretKey,
            publicKey: keypair.publicKey,
        };
    }

    toAgreementPublicKey(publicKey: Bytes): Bytes {
        return ed25519PublicKeyToX25519(publicKey);
    }

    toAgreementPrivateKey(privateKey: Bytes): Bytes {
        return ed25519SecretKeyToX25519(privateKey);
    }
}