import type { Bytes } from "../../../types/common";
import type { BodyEncoding, PacketKeyPair } from "../../types/common";
import {
    type AsymmetricEncryptionAlgorithm,
    type KeyDerivationAlgorithm,
    type WrappedKey,
} from "../../types/asymmetric";
import type { SymmetricEncryptionAlgorithm } from "../../types/symmetric";

export type SharedKeyContext = {
    alg: AsymmetricEncryptionAlgorithm;
    kdf: KeyDerivationAlgorithm;
    enc: SymmetricEncryptionAlgorithm;
    info: Bytes;
};

export type SealResult = {
    params: Record<string, string>;
    data: string;
};

export interface RecipientKeyAdapter<
    TAlg extends AsymmetricEncryptionAlgorithm = AsymmetricEncryptionAlgorithm,
> {
    readonly alg: TAlg;

    generateKeyPairFromSeed(seed: Bytes): PacketKeyPair;

    /**
     * Converts the public key given by the app/user into the key-agreement public key.
     *
     * Native X25519:
     *   X25519 pubkey -> X25519 pubkey
     *
     * Solana converted:
     *   Ed25519 wallet pubkey -> X25519 pubkey
     */
    toAgreementPublicKey(publicKey: Bytes): Bytes;

    /**
     * Converts the private key given by the app/wallet into the key-agreement private key.
     *
     * Native X25519:
     *   X25519 private key -> X25519 private key
     *
     * Solana converted:
     *   Ed25519 seed/secretKey -> X25519 private key
     */
    toAgreementPrivateKey(privateKey: Bytes): Bytes;
}

export interface SharedKeyDeriver<
    TKdf extends KeyDerivationAlgorithm = KeyDerivationAlgorithm,
> {
    readonly kdf: TKdf;

    deriveKey(input: {
        localPrivateKey: Bytes;
        remotePublicKey: Bytes;
        context: SharedKeyContext;
        keyLength: number;
    }): Bytes;
}

export interface KeyWrapCipher<
    TEnc extends SymmetricEncryptionAlgorithm = SymmetricEncryptionAlgorithm,
> {
    readonly enc: TEnc;

    seal(input: {
        key: Bytes;
        cleartext: Bytes;
        encoding: BodyEncoding;
    }): Promise<SealResult>;

    open(input: {
        key: Bytes;
        wrapped: WrappedKey;
    }): Promise<Bytes>;
}