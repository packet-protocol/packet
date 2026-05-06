import tweetnacl from "tweetnacl";

import type { Bytes } from "../../../types/common";
import type { BodyEncoding } from "../../types/common";
import type { WrappedKey } from "../../types/asymmetric";
import { SymmetricEncryptionAlgorithm } from "../../types/symmetric";
import { PacketEncoder } from "../../utils/encoding";
import { Aes256GcmSuite } from "../../symmetric/aes256gcm";
import type { KeyWrapCipher, SealResult } from "./types";
import { randomBytes } from "crypto";

export class Aes256GcmKeyWrapCipher
    implements KeyWrapCipher<SymmetricEncryptionAlgorithm.A256GCM> {
    readonly enc = SymmetricEncryptionAlgorithm.A256GCM as const;

    private readonly aes256Gcm = new Aes256GcmSuite();

    async seal(input: {
        key: Bytes;
        cleartext: Bytes;
        encoding: BodyEncoding;
    }): Promise<SealResult> {
        const encrypted = await this.aes256Gcm.encrypt(
            input.key,
            input.cleartext,
            input.encoding,
        );

        return {
            params: {
                iv: encrypted.params.iv,
                tag: encrypted.params.tag,
            },
            data: encrypted.data,
        };
    }

    async open(input: {
        key: Bytes;
        wrapped: WrappedKey;
    }): Promise<Bytes> {
        if (input.wrapped.enc !== this.enc) {
            throw new Error("Wrapped key enc mismatch");
        }

        const params = input.wrapped.params as {
            iv: string;
            tag: string;
        };

        return this.aes256Gcm.decrypt(input.key, {
            alg: SymmetricEncryptionAlgorithm.A256GCM,
            encoding: input.wrapped.encoding,
            params: {
                iv: params.iv,
                tag: params.tag,
            },
            data: input.wrapped.data,
        });
    }
}

export class XSalsa20Poly1305KeyWrapCipher
    implements KeyWrapCipher<SymmetricEncryptionAlgorithm.XSALSA20_POLY1305> {
    readonly enc = SymmetricEncryptionAlgorithm.XSALSA20_POLY1305 as const;

    async seal(input: {
        key: Bytes;
        cleartext: Bytes;
        encoding: BodyEncoding;
    }): Promise<SealResult> {
        if (input.encoding !== "base64") {
            throw new Error("XSalsa20-Poly1305 wrap only supports base64 encoding");
        }

        const nonce = randomBytes(tweetnacl.secretbox.nonceLength);
        const ciphertext = tweetnacl.secretbox(input.cleartext, nonce, input.key);

        const encoder = new PacketEncoder(input.encoding);

        const encoded = encoder.encodeFields({
            nonce,
            data: ciphertext,
        });

        return {
            params: {
                nonce: encoded.nonce,
            },
            data: encoded.data,
        };
    }

    async open(input: {
        key: Bytes;
        wrapped: WrappedKey;
    }): Promise<Bytes> {
        if (input.wrapped.enc !== this.enc) {
            throw new Error("Wrapped key enc mismatch");
        }

        if (input.wrapped.encoding !== "base64") {
            throw new Error("XSalsa20-Poly1305 wrap only supports base64 encoding");
        }

        const params = input.wrapped.params as {
            nonce: string;
        };

        const encoder = new PacketEncoder(input.wrapped.encoding);

        const { nonce, data } = encoder.decodeFields({
            nonce: params.nonce,
            data: input.wrapped.data,
        });

        const cleartext = tweetnacl.secretbox.open(data, nonce, input.key);

        if (!cleartext) {
            throw new Error("message authentication failed");
        }

        return cleartext;
    }
}