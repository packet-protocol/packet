import type { BodyEncoding } from "./common.js";
import type { SymmetricEncryptionAlgorithm } from "./symmetric.js";

export enum AsymmetricEncryptionAlgorithm {
    X25519 = "X25519",
    SOLANA_ED25519_X25519 = "SOLANA-ED25519-X25519",
}

export enum KeyDerivationAlgorithm {
    HKDF_SHA256 = "HKDF-SHA256",
    NACL_BOX_BEFORE = "NACL-BOX-BEFORE",
}

export type A256GCMWrappedKeyParams = {
    epk: string;
    iv: string;
    tag: string;
};

export type XSalsa20Poly1305WrappedKeyParams = {
    epk: string;
    nonce: string;
};

export type WrappedKeyParamsByEncryption = {
    [SymmetricEncryptionAlgorithm.A256GCM]: A256GCMWrappedKeyParams;
    [SymmetricEncryptionAlgorithm.XSALSA20_POLY1305]: XSalsa20Poly1305WrappedKeyParams;
};

export type WrappedKeyByEncryption<
    TAlg extends AsymmetricEncryptionAlgorithm,
    TKdf extends KeyDerivationAlgorithm,
> = {
    [TEnc in SymmetricEncryptionAlgorithm]: {
        alg: TAlg;
        kdf: TKdf;
        enc: TEnc;
        encoding: BodyEncoding;
        params: WrappedKeyParamsByEncryption[TEnc];
        data: string;
    };
};

export type WrappedKey<
    TAlg extends AsymmetricEncryptionAlgorithm = AsymmetricEncryptionAlgorithm,
    TKdf extends KeyDerivationAlgorithm = KeyDerivationAlgorithm,
    TEnc extends SymmetricEncryptionAlgorithm = SymmetricEncryptionAlgorithm,
> = WrappedKeyByEncryption<TAlg, TKdf>[TEnc];

export type X25519A256GCMWrappedKey = WrappedKey<
    AsymmetricEncryptionAlgorithm.X25519,
    KeyDerivationAlgorithm.HKDF_SHA256,
    SymmetricEncryptionAlgorithm.A256GCM
>;

export type SolanaEd25519X25519BoxWrappedKey = WrappedKey<
    AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519,
    KeyDerivationAlgorithm.NACL_BOX_BEFORE,
    SymmetricEncryptionAlgorithm.XSALSA20_POLY1305
>;