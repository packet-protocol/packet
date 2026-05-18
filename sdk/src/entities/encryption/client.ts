import { Keypair, PublicKey } from "@solana/web3.js";

import {
    decryptPacketMessage,
    encryptPacketMessage,
    hasReaderEntry,
    packetReaderFromIdentity,
    solanaIdentityFromKeypair,
    x25519IdentityFromKeyPair,
    x25519IdentityFromSeed,
    x25519IdentityFromWalletPassword,
    type DerivePacketSeedInput,
    type PacketCryptoIdentity,
    type PacketDerivedCryptoIdentity,
} from "../../crypto/packet";

import { AsymmetricEncryptionAlgorithm, type PacketEncryptedBody, type PacketKeyPair, type PacketReaderInput } from "../../crypto";
import { PACKET_ENCRYPTED_BODY_PREFIX, type PacketCryptoIdentityInput, type PacketDecryptParams, type PacketEncryptionReader, type PacketEncryptParams, type PacketMaybeDecryptResult } from "./types";
import type { PacketClient } from "../..";

function normalizeIdentity(input: PacketCryptoIdentityInput): PacketCryptoIdentity {
    if ("keyPair" in input) {
        return input;
    }

    return {
        ownerWallet: input.ownerWallet ?? "",
        keyAlg: input.keyAlg,
        keyPair: {
            publicKey: input.publicKey,
            privateKey: input.privateKey,
        },
    };
}

function readerKey(reader: PacketReaderInput): string {
    return [
        reader.ownerWallet,
        reader.keyAlg,
        Buffer.from(reader.publicKey).toString("base64"),
    ].join(":");
}

function dedupeReaders(readers: PacketReaderInput[]): PacketReaderInput[] {
    const seen = new Set<string>();
    const out: PacketReaderInput[] = [];

    for (const reader of readers) {
        const key = readerKey(reader);

        if (seen.has(key)) continue;

        seen.add(key);
        out.push(reader);
    }

    return out;
}

export class PacketEncryptionClient {
    private identity?: PacketCryptoIdentity;

    get Identity(): PacketCryptoIdentity | undefined {
        return this.identity;
    }

    get HasIdentity(): boolean {
        return this.identity !== undefined;
    }

    /**
    * Set the active encryption identity.
    *
    * The active identity is used for:
    * - auto-including self as a reader during encryption
    * - decrypting when no explicit identity is passed
    */
    use(identity: PacketCryptoIdentityInput): this {
        this.identity = normalizeIdentity(identity);

        if (!this.identity.ownerWallet) {
            throw new Error("Crypto identity ownerWallet is required");
        }

        return this;
    }

    /**
     * Node/localnet helper.
     *
     * Uses a Solana Keypair directly for SOLANA_ED25519_X25519 encryption.
     * Browser wallets cannot use this because they do not expose secret keys.
     */
    useSolanaKeypair(wallet: Keypair): this {
        return this.use(solanaIdentityFromKeypair(wallet));
    }

    /**
    * Deterministic X25519 helper.
    *
    * Useful when you already have a 32-byte seed from password/wallet signing.
    */
    useX25519Seed(input: {
        ownerWallet: PublicKey | string;
        seed: Uint8Array;
    }): this {
        return this.use(x25519IdentityFromSeed(input));
    }

    useX25519KeyPair(input: {
        ownerWallet: PublicKey | string;
        keyPair: PacketKeyPair;
    }): this {
        return this.use(x25519IdentityFromKeyPair(input));
    }

    /**
     * Browser-wallet helper.
     *
     * Derives a deterministic X25519 identity from:
     * password + wallet address + wallet signMessage().
     */
    async useWalletPassword(
        input: DerivePacketSeedInput,
    ): Promise<PacketDerivedCryptoIdentity> {
        const derived = await x25519IdentityFromWalletPassword(input);
        this.use(derived.identity);
        return derived;
    }

    clearIdentity(): this {
        this.identity = undefined;
        return this;
    }

    requireIdentity(): PacketCryptoIdentity {
        if (!this.identity) {
            throw new Error("Packet encryption identity is not configured");
        }

        return this.identity;
    }

    /**
    * Return this client's public reader entry.
    *
    * Add this to another user's reader list if you want this identity
    * to be able to decrypt the message.
    */
    selfReader(): PacketReaderInput {
        return packetReaderFromIdentity(this.requireIdentity());
    }

    /**
     * Create a reader entry for another user's public encryption key.
     */
    reader(input: {
        ownerWallet: PublicKey | string;
        keyAlg: PacketReaderInput["keyAlg"];
        publicKey: Uint8Array;
    }): PacketReaderInput {
        return {
            ownerWallet:
                input.ownerWallet instanceof PublicKey
                    ? input.ownerWallet.toBase58()
                    : input.ownerWallet,
            keyAlg: input.keyAlg,
            publicKey: input.publicKey,
        };
    }

    private resolveReaders(params: {
        readers?: PacketEncryptionReader[];
        includeSelf?: boolean;
    }): PacketEncryptionReader[] {
        const includeSelf = params.includeSelf ?? true;
        const readers = [...(params.readers ?? [])];

        if (includeSelf) {
            readers.unshift(this.selfReader());
        }

        const deduped = dedupeReaders(readers);

        if (deduped.length === 0) {
            throw new Error("At least one encryption reader is required");
        }

        return deduped;
    }

    /**
     * Encrypt plaintext into a Packet encrypted body.
     *
     * By default this auto-includes the active identity as a reader.
     * Pass `includeSelf: false` to disable that.
     */
    async encrypt(params: PacketEncryptParams): Promise<PacketEncryptedBody> {
        const readers = this.resolveReaders({
            readers: params.readers,
            includeSelf: params.includeSelf,
        });

        return encryptPacketMessage(params.plaintext, readers, {
            encoding: params.encoding,
            contentEnc: params.contentEnc,
            keyKdf: params.keyKdf,
            keyEnc: params.keyEnc,
        });
    }

    toJson(body: PacketEncryptedBody): string {
        return JSON.stringify(body);
    }

    fromJson(json: string): PacketEncryptedBody {
        const parsed = JSON.parse(json);

        if (!this.isBody(parsed)) {
            throw new Error("Invalid Packet encrypted body JSON");
        }

        return parsed;
    }

    toContent(body: PacketEncryptedBody): string {
        return `${PACKET_ENCRYPTED_BODY_PREFIX}${this.toJson(body)}`;
    }

    fromContent(content: string): PacketEncryptedBody {
        const raw = content.startsWith(PACKET_ENCRYPTED_BODY_PREFIX)
            ? content.slice(PACKET_ENCRYPTED_BODY_PREFIX.length)
            : content;

        return this.fromJson(raw);
    }

    tryFromContent(content: string): PacketEncryptedBody | null {
        try {
            return this.fromContent(content);
        } catch {
            return null;
        }
    }

    isEncryptedContent(content: string): boolean {
        return this.tryFromContent(content) !== null;
    }

    isBody(value: unknown): value is PacketEncryptedBody {
        if (!value || typeof value !== "object") return false;

        const body = value as Partial<PacketEncryptedBody>;

        return (
            body.ver === 1 &&
            !!body.content &&
            typeof body.content === "object" &&
            typeof body.content.data === "string" &&
            typeof body.content.key_hash === "string" &&
            Array.isArray(body.readers)
        );
    }

    async encryptToJson(params: PacketEncryptParams): Promise<string> {
        const body = await this.encrypt(params);
        return this.toJson(body);
    }

    /**
   * Convert encrypted body to inline message content.
   *
   * Store/send this string as normal Packet message content.
   */
    async encryptToContent(params: PacketEncryptParams): Promise<string> {
        const body = await this.encrypt(params);
        const content = this.toContent(body);

        const maxInlineBytes = params.maxInlineBytes ?? false;

        if (maxInlineBytes !== false) {
            const size = Buffer.byteLength(content, "utf8");

            if (size > maxInlineBytes) {
                throw new Error(
                    `Encrypted message too large for inline content: ${size} bytes > ${maxInlineBytes}`,
                );
            }
        }

        return content;
    }

    hasReader(
        body: PacketEncryptedBody | string,
        identityInput?: PacketCryptoIdentityInput,
    ): boolean {
        const parsed = typeof body === "string"
            ? this.fromContent(body)
            : body;

        const identity = identityInput
            ? normalizeIdentity(identityInput)
            : this.requireIdentity();

        return hasReaderEntry(
            parsed,
            identity.keyPair.publicKey,
            identity.keyAlg,
        );
    }

    async decrypt(params: PacketDecryptParams): Promise<string> {
        const body = typeof params.body === "string"
            ? this.fromContent(params.body)
            : params.body;

        const identity = params.identity
            ? normalizeIdentity(params.identity)
            : this.requireIdentity();

        return decryptPacketMessage({
            body,
            keyAlg: identity.keyAlg,
            keyPair: identity.keyPair,
        });
    }

    /**
    * Try to decrypt if content is encrypted.
    *
    * If content is plain text, it returns plaintext unchanged.
    */
    async maybeDecrypt(
        content: string,
        identity?: PacketCryptoIdentityInput,
    ): Promise<PacketMaybeDecryptResult> {
        const body = this.tryFromContent(content);

        if (!body) {
            return {
                encrypted: false,
                plaintext: content,
            };
        }

        const plaintext = await this.decrypt({
            body,
            identity,
        });

        return {
            encrypted: true,
            plaintext,
            body,
        };
    }

    static async LoadReaderForOwner(
        client: PacketClient,
        {
            ownerWallet,
            fallbackToWalletDerived = true
        }: {
            ownerWallet: PublicKey | string,
            fallbackToWalletDerived?: boolean,
        },
    ): Promise<PacketReaderInput> {
        var wallet = typeof ownerWallet === "string"
            ? new PublicKey(ownerWallet)
            : ownerWallet;
        try {
            const key = await client.key(wallet).loadNullable();
            if (key) {
                return key.Reader;
            } else if (!fallbackToWalletDerived) {
                throw new Error("Key not found for owner wallet: " + wallet.toBase58());
            }
        } catch (err) {
            if (!fallbackToWalletDerived) {
                throw err;
            }
        }

        const reader = client.crypto.reader({
            ownerWallet: wallet,
            keyAlg: AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519,
            publicKey: wallet.toBytes(),
        });

        return reader;
    }

    static LoadWalletDerivedReader(ownerWallet: PublicKey | string): PacketReaderInput {
        var wallet = typeof ownerWallet === "string"
            ? new PublicKey(ownerWallet)
            : ownerWallet;

        return {
            ownerWallet: wallet.toBase58(),
            keyAlg: AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519,
            publicKey: wallet.toBytes(),
        };
    }
}