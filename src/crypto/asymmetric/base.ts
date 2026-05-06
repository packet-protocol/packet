import { sha256 } from "@noble/hashes/sha2";

import type { Bytes } from "../../types/common";
import type { BodyEncoding, PacketKeyPair, HashValue } from "../types/common";
import {
    type AsymmetricEncryptionAlgorithm,
    type WrappedKey,
} from "../types/asymmetric";

export type WrapKeyOptions = {
    encoding?: BodyEncoding;
};

export abstract class BaseCryptoSuite<
    TAlg extends AsymmetricEncryptionAlgorithm = AsymmetricEncryptionAlgorithm,
> {
    abstract readonly alg: TAlg;

    abstract generateKeyPairFromSeed(seed: Bytes): PacketKeyPair;

    abstract wrapKey(
        recipientPublicKey: Bytes,
        contentKey: Bytes,
        options?: WrapKeyOptions,
    ): Promise<WrappedKey<TAlg>>;

    abstract unwrapKey(
        recipientPrivateKey: Bytes,
        wrapped: WrappedKey<TAlg>,
    ): Promise<Bytes>;

    hashKey(publicKey: Bytes): HashValue {
        return `sha256:${Buffer.from(sha256(publicKey)).toString("hex")}`;
    }
}