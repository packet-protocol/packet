import { concatBytes, randomBytes } from "@noble/hashes/utils";
import type { Bytes } from "../../types/common";
import { SymmetricEncryptionAlgorithm, type A256GCMEncrypted } from "../types/symmetric";
import { BaseSymmetricSuite } from "./base";
import type { BodyEncoding } from "../types/common";
import { PacketEncoder } from "../utils/encoding";

export class Aes256GcmSuite extends BaseSymmetricSuite<SymmetricEncryptionAlgorithm.A256GCM> {
    readonly alg = SymmetricEncryptionAlgorithm.A256GCM as const;

    async encrypt(
        key: Bytes,
        data: Bytes,
        encoding: BodyEncoding = "base64",
        iv?: Bytes,
    ): Promise<A256GCMEncrypted> {
        if (key.length !== 32) {
            throw new Error("AES-256-GCM requires a 32-byte key");
        }

        var iv = iv ?? randomBytes(12);
        const cryptoKey = await Aes256GcmSuite.importAesKey(key);

        const encrypted = new Uint8Array(
            await crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv as unknown as Uint8Array<ArrayBuffer>, tagLength: 128 },
                cryptoKey,
                data as unknown as Uint8Array<ArrayBuffer>,
            ),
        );

        const encoded = new PacketEncoder(encoding).encodeFields({
            iv: iv,
            tag: encrypted.slice(encrypted.length - 16),
            data: encrypted.slice(0, encrypted.length - 16),
        });

        return {
            alg: this.alg,
            encoding,
            params: {
                iv: encoded.iv,
                tag: encoded.tag,
            },
            data: encoded.data,
        };
    }

     async decrypt(
        key: Bytes,
        payload: A256GCMEncrypted,
    ): Promise<Bytes> {
        if (key.length !== 32) {
            throw new Error("AES-256-GCM requires a 32-byte key");
        }

        const cryptoKey = await Aes256GcmSuite.importAesKey(key);

        const encoder = new PacketEncoder(payload.encoding);
        const { iv, tag } = encoder.decodeFields(payload.params);
        const data = encoder.decode(payload.data);

        const combined = concatBytes(data, tag);

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv as unknown as Uint8Array<ArrayBuffer>, tagLength: 128 },
            cryptoKey,
            combined as unknown as Uint8Array<ArrayBuffer>,
        );

        return new Uint8Array(decrypted);
    }

    private static importAesKey(rawKey: Bytes): Promise<CryptoKey> {
        return crypto.subtle.importKey(
            "raw",
            rawKey as unknown as Uint8Array<ArrayBuffer>,
            { name: "AES-GCM" },
            false,
            ["encrypt", "decrypt"],
        );
    }
}