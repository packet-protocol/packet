import type { Bytes } from "../../types/common";
import type {
    PacketEncryptedBody,
    ReaderEntry,
} from "../types/packet";
import { AsymmetricEncryptionAlgorithm } from "../types/asymmetric";
import { hashLabel } from "../utils/hash";

export function findReaderEntry(
    body: PacketEncryptedBody,
    publicKey: Bytes,
    keyAlg: AsymmetricEncryptionAlgorithm,
): ReaderEntry | undefined {
    const keyHash = hashLabel("sha256", publicKey);

    return body.readers.find((reader) => {
        return reader.key.alg === keyAlg && reader.key_hash === keyHash;
    });
}

export function hasReaderEntry(
    body: PacketEncryptedBody,
    publicKey: Bytes,
    keyAlg: AsymmetricEncryptionAlgorithm,
): boolean {
    return Boolean(findReaderEntry(body, publicKey, keyAlg));
}
