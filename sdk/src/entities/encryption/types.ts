import type { PublicKey } from "@solana/web3.js";

import type {
    AsymmetricEncryptionAlgorithm,
    BodyEncoding,
    KeyDerivationAlgorithm,
    PacketCryptoIdentity,
    PacketEncryptedBody,
    PacketReaderInput,
    SymmetricEncryptionAlgorithm,
} from "../../crypto/index.js";

export const PACKET_ENCRYPTED_BODY_PREFIX = "packet:enc:v1:";

export type PacketCryptoIdentityInput =
    | PacketCryptoIdentity
    | {
        ownerWallet?: PublicKey | string;
        keyAlg: AsymmetricEncryptionAlgorithm;
        publicKey: Uint8Array;
        privateKey: Uint8Array;
    };

export type PacketEncryptionReader = PacketReaderInput;

export type PacketReaderInputParams = {
    ownerWallet: PublicKey | string;
    keyAlg: AsymmetricEncryptionAlgorithm;
    publicKey: Uint8Array;
};

export type PacketEncryptionOptions = {
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

    /**
     * Default true.
     *
     * If true and a default identity exists, encryption automatically includes
     * this client as a reader.
     */
    includeSelf?: boolean;

    /**
     * Maximum byte length for the encrypted content. If the encrypted content exceeds this limit, an error is thrown.  
     */
    maxInlineBytes?: number;
};

export type PacketEncryptParams = {
    plaintext: string;
    readers?: PacketEncryptionReader[];
} & PacketEncryptionOptions;

export type PacketDecryptParams = {
    body: PacketEncryptedBody | string;
    identity?: PacketCryptoIdentityInput;
};

export type PacketMaybeDecryptResult =
    | {
        encrypted: true;
        plaintext: string;
        body: PacketEncryptedBody;
    }
    | {
        encrypted: false;
        plaintext: string;
    };