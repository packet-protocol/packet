import type { BodyEncoding } from "./common.js";

export enum SymmetricEncryptionAlgorithm {
    A256GCM = "A256GCM",
    XSALSA20_POLY1305 = "XSALSA20-POLY1305",
}

export type A256GCMParams = {
    iv: string;
    tag: string;
};

export type XSalsa20Poly1305Params = {
    nonce: string;
};

export type SymmetricParamsByAlgorithm = {
    [SymmetricEncryptionAlgorithm.A256GCM]: A256GCMParams;
    [SymmetricEncryptionAlgorithm.XSALSA20_POLY1305]: XSalsa20Poly1305Params;
};

export type EncryptedByAlgorithm = {
    [TAlg in SymmetricEncryptionAlgorithm]: {
        alg: TAlg;
        encoding: BodyEncoding;
        params: SymmetricParamsByAlgorithm[TAlg];
        data: string;
    };
};

export type Encrypted<
    TAlg extends SymmetricEncryptionAlgorithm = SymmetricEncryptionAlgorithm,
> = EncryptedByAlgorithm[TAlg];

export type A256GCMEncrypted =
    Encrypted<SymmetricEncryptionAlgorithm.A256GCM>;

export type XSalsa20Poly1305Encrypted =
    Encrypted<SymmetricEncryptionAlgorithm.XSALSA20_POLY1305>;