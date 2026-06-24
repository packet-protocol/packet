import type { Bytes } from "../../types/common.js";

import { Aes256GcmSuite } from "../symmetric/aes256gcm.js";

import type { PacketEncryptedBody } from "../types/packet.js";
import type { PacketKeyPair } from "../types/common.js";

import { AsymmetricEncryptionAlgorithm } from "../types/asymmetric.js";
import { SymmetricEncryptionAlgorithm } from "../types/symmetric.js";

import { findReaderEntry } from "./reader.js";
import { text } from "../../utils/encoding.js";

import { getKeyWrapSuiteForWrappedKey } from "./suites.js";

type DecryptPacketParams = {
    body: PacketEncryptedBody;

    /**
     * Key universe of the supplied keypair.
     *
     * X25519:
     *   keyPair.publicKey = X25519 public key
     *   keyPair.privateKey = X25519 private key
     *
     * SOLANA-ED25519-X25519:
     *   keyPair.publicKey = Solana Ed25519 wallet public key
     *   keyPair.privateKey = Ed25519 seed or Solana/tweetnacl secretKey
     */
    keyAlg: AsymmetricEncryptionAlgorithm;

    keyPair: PacketKeyPair;
};

export async function decryptPacketMessage({
    body,
    keyAlg,
    keyPair: { publicKey, privateKey },
}: DecryptPacketParams): Promise<string> {
    const entry = findReaderEntry(body, publicKey, keyAlg);

    if (!entry) {
        throw new Error("Reader entry not found");
    }

    const suite = getKeyWrapSuiteForWrappedKey(entry.key);

    const contentKey: Bytes = await suite.unwrapKey(privateKey, entry.key);

    if (body.content.alg !== SymmetricEncryptionAlgorithm.A256GCM) {
        throw new Error(`Unsupported content encryption algorithm: ${body.content.alg}`);
    }

    const aes = new Aes256GcmSuite();

    const decrypted = await aes.decrypt(contentKey, {
        alg: body.content.alg,
        encoding: body.content.encoding,
        params: body.content.params,
        data: body.content.data,
    });

    return text(decrypted);
}