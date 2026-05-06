import { x25519 } from "@noble/curves/ed25519";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha2";
import tweetnacl from "tweetnacl";

import type { Bytes } from "../../../types/common";
import { KeyDerivationAlgorithm } from "../../types/asymmetric";
import type { SharedKeyDeriver } from "./types";

export class HkdfSha256SharedKeyDeriver
    implements SharedKeyDeriver<KeyDerivationAlgorithm.HKDF_SHA256> {
    readonly kdf = KeyDerivationAlgorithm.HKDF_SHA256 as const;

    deriveKey(input: {
        localPrivateKey: Bytes;
        remotePublicKey: Bytes;
        context: {
            info: Bytes;
        };
        keyLength: number;
    }): Bytes {
        const sharedSecret = x25519.getSharedSecret(
            input.localPrivateKey,
            input.remotePublicKey,
        );

        return hkdf(
            sha256,
            sharedSecret,
            undefined,
            input.context.info,
            input.keyLength,
        );
    }
}

export class NaclBoxBeforeSharedKeyDeriver
    implements SharedKeyDeriver<KeyDerivationAlgorithm.NACL_BOX_BEFORE> {
    readonly kdf = KeyDerivationAlgorithm.NACL_BOX_BEFORE as const;

    deriveKey(input: {
        localPrivateKey: Bytes;
        remotePublicKey: Bytes;
        keyLength: number;
    }): Bytes {
        if (input.keyLength !== 32) {
            throw new Error("NaCl box shared key must be 32 bytes");
        }

        return tweetnacl.box.before(
            input.remotePublicKey,
            input.localPrivateKey,
        );
    }
}