import { x25519 } from "@noble/curves/ed25519";
import { randomBytes } from "@noble/hashes/utils";

import type { Bytes } from "../../../types/common";
import type { BodyEncoding, PacketKeyPair } from "../../types/common";
import {
    type AsymmetricEncryptionAlgorithm,
    type KeyDerivationAlgorithm,
    type WrappedKey,
} from "../../types/asymmetric";
import type { SymmetricEncryptionAlgorithm } from "../../types/symmetric";
import { utf8 } from "../../../utils/encoding";
import { PacketEncoder } from "../../utils/encoding";
import { BaseCryptoSuite } from "../base";
import type {
    KeyWrapCipher,
    RecipientKeyAdapter,
    SharedKeyDeriver,
} from "./types";

export type KeyWrapSuiteOptions = {
    encoding?: BodyEncoding;
    kdf?: KeyDerivationAlgorithm;
    enc?: SymmetricEncryptionAlgorithm;
};

export type KeyWrapSuiteConfig<
    TAlg extends AsymmetricEncryptionAlgorithm,
> = {
    recipient: RecipientKeyAdapter<TAlg>;

    defaultKdf: KeyDerivationAlgorithm;
    defaultEnc: SymmetricEncryptionAlgorithm;

    derivers: SharedKeyDeriver[];
    ciphers: KeyWrapCipher[];
};

export class KeyWrapPipelineSuite<
    TAlg extends AsymmetricEncryptionAlgorithm,
> extends BaseCryptoSuite<TAlg> {
    readonly alg: TAlg;

    private readonly recipient: RecipientKeyAdapter<TAlg>;
    private readonly defaultKdf: KeyDerivationAlgorithm;
    private readonly defaultEnc: SymmetricEncryptionAlgorithm;

    private readonly derivers = new Map<KeyDerivationAlgorithm, SharedKeyDeriver>();
    private readonly ciphers = new Map<SymmetricEncryptionAlgorithm, KeyWrapCipher>();

    constructor(config: KeyWrapSuiteConfig<TAlg>) {
        super();

        this.recipient = config.recipient;
        this.alg = config.recipient.alg;
        this.defaultKdf = config.defaultKdf;
        this.defaultEnc = config.defaultEnc;

        for (const deriver of config.derivers) {
            this.derivers.set(deriver.kdf, deriver);
        }

        for (const cipher of config.ciphers) {
            this.ciphers.set(cipher.enc, cipher);
        }
    }

    generateKeyPairFromSeed(seed: Bytes): PacketKeyPair {
        return this.recipient.generateKeyPairFromSeed(seed);
    }

    async wrapKey(
        recipientPublicKey: Bytes,
        contentKey: Bytes,
        options: KeyWrapSuiteOptions = {},
    ): Promise<WrappedKey<TAlg>> {
        const encoding = options.encoding ?? "base64";
        const kdf = options.kdf ?? this.defaultKdf;
        const enc = options.enc ?? this.defaultEnc;

        const deriver = this.derivers.get(kdf);
        if (!deriver) {
            throw new Error(`Unsupported ${this.alg} KDF: ${kdf}`);
        }

        const cipher = this.ciphers.get(enc);
        if (!cipher) {
            throw new Error(`Unsupported ${this.alg} key wrapping enc: ${enc}`);
        }

        const recipientAgreementPublicKey =
            this.recipient.toAgreementPublicKey(recipientPublicKey);

        const ephSk = randomBytes(32);
        const ephPk = x25519.getPublicKey(ephSk);

        const wrappingKey = deriver.deriveKey({
            localPrivateKey: ephSk,
            remotePublicKey: recipientAgreementPublicKey,
            keyLength: 32,
            context: {
                alg: this.alg,
                kdf,
                enc,
                info: this.makeKdfInfo(kdf, enc),
            },
        });

        const sealed = await cipher.seal({
            key: wrappingKey,
            cleartext: contentKey,
            encoding,
        });

        const encoder = new PacketEncoder(encoding);
        const encoded = encoder.encodeFields({
            epk: ephPk,
        });

        return {
            alg: this.alg,
            kdf,
            enc,
            encoding,
            params: {
                epk: encoded.epk,
                ...sealed.params,
            },
            data: sealed.data,
        } as WrappedKey<TAlg>;
    }

    async unwrapKey(
        recipientPrivateKey: Bytes,
        wrapped: WrappedKey<TAlg>,
    ): Promise<Bytes> {
        if (wrapped.alg !== this.alg) {
            throw new Error("Wrapped key alg mismatch");
        }

        const deriver = this.derivers.get(wrapped.kdf);
        if (!deriver) {
            throw new Error(`Unsupported ${this.alg} KDF: ${wrapped.kdf}`);
        }

        const cipher = this.ciphers.get(wrapped.enc);
        if (!cipher) {
            throw new Error(`Unsupported ${this.alg} key wrapping enc: ${wrapped.enc}`);
        }

        const params = wrapped.params as {
            epk: string;
        };

        const encoder = new PacketEncoder(wrapped.encoding);

        const { epk } = encoder.decodeFields({
            epk: params.epk,
        });

        const recipientAgreementPrivateKey =
            this.recipient.toAgreementPrivateKey(recipientPrivateKey);

        const wrappingKey = deriver.deriveKey({
            localPrivateKey: recipientAgreementPrivateKey,
            remotePublicKey: epk,
            keyLength: 32,
            context: {
                alg: this.alg,
                kdf: wrapped.kdf,
                enc: wrapped.enc,
                info: this.makeKdfInfo(wrapped.kdf, wrapped.enc),
            },
        });

        return cipher.open({
            key: wrappingKey,
            wrapped,
        });
    }

    /**
     * Helper for Wallet Standard experimental:decrypt.
     *
     * Only valid for:
     *   SOLANA_ED25519_X25519 + NACL_BOX_BEFORE + XSALSA20_POLY1305
     */
    decodeWalletDecryptPayload(wrapped: WrappedKey<TAlg>): {
        publicKey: Bytes;
        nonce: Bytes;
        ciphertext: Bytes;
    } {
        const params = wrapped.params as {
            epk: string;
            nonce?: string;
        };

        if (!params.nonce) {
            throw new Error("Wrapped key does not contain a NaCl box nonce");
        }

        const encoder = new PacketEncoder(wrapped.encoding);

        const { epk, nonce, data } = encoder.decodeFields({
            epk: params.epk,
            nonce: params.nonce,
            data: wrapped.data,
        });

        return {
            publicKey: epk,
            nonce,
            ciphertext: data,
        };
    }

    private makeKdfInfo(
        kdf: KeyDerivationAlgorithm,
        enc: SymmetricEncryptionAlgorithm,
    ): Bytes {
        if (
            this.alg === "X25519" &&
            kdf === "HKDF-SHA256" &&
            enc === "A256GCM"
        ) {
            return utf8("packet:x25519:wrap:v1");
        }

        return utf8(`packet:${this.alg}:${kdf}:${enc}:wrap:v1`);
    }
}