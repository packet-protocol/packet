import type { PublicKey } from "@solana/web3.js";
import type { PacketReaderInput } from "../../crypto/index.js";

export enum PacketKeyType {
    X25519 = "x25519",
    Secp256k1 = "secp256k1",
    Ed25519WalletDerivedX25519 = "ed25519WalletDerivedX25519",
    Other = "other",
}

export type PacketKeyTypeInput =
    | PacketKeyType
    | "x25519"
    | "secp256k1"
    | "ed25519WalletDerivedX25519"
    | {
        other: number;
    };

export type UserDecryptionKey = {
    address: PublicKey;
    owner: PublicKey;
    keyType: PacketKeyTypeInput;
    key: Uint8Array;
};

export type CreateUserKeyParams = {

    /**
     * Public encryption key bytes.
     *
     * If omitted, Rust defaults to owner's wallet public key and
     * Ed25519WalletDerivedX25519.
     */
    key?: Uint8Array;

    /**
     * Required when key is provided.
     */
    keyType?: PacketKeyTypeInput;
};

export type EditUserKeyParams = {

    /**
     * New public encryption key bytes.
     *
     * If omitted, no edit is performed.
     */
    key?: Uint8Array;

    /**
     * Required when key is provided.
     */
    keyType?: PacketKeyTypeInput;
};

export type UserKeyReader = PacketReaderInput;