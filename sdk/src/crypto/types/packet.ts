import type { HashValue } from "./common.js";
import type { AsymmetricEncryptionAlgorithm, WrappedKey } from "./asymmetric.js";
import type { A256GCMEncrypted, Encrypted } from "./symmetric.js";
import type { Bytes } from "../../types/common.js";

export type ReaderEntry<
    TWrappedKey extends WrappedKey = WrappedKey,
> = {
    owner_hash: HashValue;
    key_hash: HashValue;
    key: TWrappedKey;
};

export type EncryptedContent<
    TEncrypted extends Encrypted = A256GCMEncrypted,
> = TEncrypted & {
    key_hash: HashValue;
    content_hash: HashValue;
};

export type PacketReaderInput = {
    ownerWallet: string;
    keyAlg: AsymmetricEncryptionAlgorithm;
    publicKey: Bytes;
};

export type PacketEncryptedBody<
    TContent extends Encrypted = A256GCMEncrypted,
    TWrappedKey extends WrappedKey = WrappedKey,
> = {
    ver: 1;
    content: EncryptedContent<TContent>;
    readers: ReaderEntry<TWrappedKey>[];
};