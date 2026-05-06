import { randomBytes } from "@noble/hashes/utils";

import type { Bytes } from "../../types/common";
import { Aes256GcmSuite } from "../symmetric/aes256gcm";

import type {
    PacketEncryptedBody,
    PacketReaderInput,
    ReaderEntry,
} from "../types/packet";
import {
    type KeyDerivationAlgorithm,
} from "../types/asymmetric";

import { SymmetricEncryptionAlgorithm } from "../types/symmetric";
import type { BodyEncoding } from "../types/common";

import { hashLabel } from "../utils/hash";
import { utf8 } from "../../utils/encoding";

import { getKeyWrapSuite } from "./suites";

export type EncryptPacketMessageOptions = {
    /**     
     * Encoding for encrypted content and keys.
     *
     * Default "base64".
     */
    encoding?: BodyEncoding;

    /**
     * Content/body encryption.
     */
    contentEnc?: SymmetricEncryptionAlgorithm;

    /**
     * Optional override for reader key wrapping.
     *
     * Leave undefined to let each suite use its own default:
     *
     * X25519:
     *   HKDF-SHA256 + A256GCM
     *
     * SOLANA-ED25519-X25519:
     *   NACL-BOX-BEFORE + XSALSA20-POLY1305
     */
    keyKdf?: KeyDerivationAlgorithm;
    keyEnc?: SymmetricEncryptionAlgorithm;
};

export async function encryptPacketMessage(
    plaintext: string,
    readers: PacketReaderInput[],
    options: EncryptPacketMessageOptions = {},
): Promise<PacketEncryptedBody> {
    const {
        encoding = "base64",
        contentEnc = SymmetricEncryptionAlgorithm.A256GCM,
        keyKdf,
        keyEnc,
    } = options;

    if (contentEnc !== SymmetricEncryptionAlgorithm.A256GCM) {
        throw new Error(`Unsupported content encryption algorithm: ${contentEnc}`);
    }

    const aes = new Aes256GcmSuite();

    const contentKey: Bytes = randomBytes(32);

    const encryptedContent = await aes.encrypt(
        contentKey,
        utf8(plaintext),
        encoding,
    );

    const readerEntries: ReaderEntry[] = [];

    const uniqueReaders = dedupeReadersByAlgAndKeyHash(readers);

    for (const reader of uniqueReaders) {
        const suite = getKeyWrapSuite(reader.keyAlg);

        const key = await suite.wrapKey(reader.publicKey, contentKey, {
            encoding,

            /**
             * Important:
             * Only pass these if caller explicitly provided them.
             * Otherwise each suite gets to choose its own default chain.
             */
            ...(keyKdf ? { kdf: keyKdf } : {}),
            ...(keyEnc ? { enc: keyEnc } : {}),
        });

        readerEntries.push({
            owner_hash: hashLabel("sha256", utf8(reader.ownerWallet)),

            /**
             * Hash the public key in the same key universe the reader supplied.
             *
             * X25519 reader:
             *   hashes X25519 pubkey
             *
             * Solana reader:
             *   hashes Solana Ed25519 wallet pubkey
             */
            key_hash: hashLabel("sha256", reader.publicKey),

            key,
        });
    }

    return {
        ver: 1,
        content: {
            ...encryptedContent,
            key_hash: hashLabel("sha256", contentKey),
        },
        readers: readerEntries,
    };
}

function dedupeReadersByAlgAndKeyHash(
    readers: PacketReaderInput[],
): PacketReaderInput[] {
    const seen = new Set<string>();

    return readers.filter((reader) => {
        const keyHash = hashLabel("sha256", reader.publicKey);
        const dedupeKey = `${reader.keyAlg}:${keyHash}`;

        if (seen.has(dedupeKey)) {
            return false;
        }

        seen.add(dedupeKey);
        return true;
    });
}