import type { PublicKey } from "@solana/web3.js";

import type { PacketClient } from "../../../client.js";
import type { Bytes } from "../../../types/common.js";
import { text } from "../../../utils/encoding.js";
import {
    loadPacketMessageContent,
    parseLoadedPacketMessageContent,
    type PacketLoadedContent,
    type ParsedPacketMessageContent,
} from "../../message/content.js";
import { AnchorEnumToMessageType } from "../../message/utils/helpers.js";
import { MessageType } from "../../message/types.js";
import type { RoomMessageData } from "../type/index.js";
import { GetRoomMessageAccount } from "../account/message.js";
import {
    decodeRoomBlobEnvelope,
    decryptRoomMessageContent,
    isRoomBlobEnvelope,
    roomBlobEnvelopeEpoch,
} from "../utils/crypto.js";
import type { RoomClient } from "./room.js";

export type RoomMessageContentLoadResult = PacketLoadedContent;

/**
 * Typed decryption outcome (mirrors the loadMessages statuses):
 * - decrypted — plaintext available;
 * - locked    — this wallet is not a recipient of the message's crypto epoch;
 * - failed    — epoch key recovered but decryption failed (tamper/corrupt).
 */
export type RoomMessageDecryptResult =
    | {
        status: "decrypted";
        /** Decrypted plaintext bytes. */
        content: Uint8Array;
        /** UTF-8 decoded plaintext (when valid UTF-8). */
        text?: string;
    }
    | { status: "locked" }
    | { status: "failed"; error: string };

/**
 * Single room message client, mirroring MessageClient's shape and its
 * account-fetch vs content-load separation:
 *
 * - load/loadRetrying/refresh — fetch the compressed RoomMessage account;
 * - decrypt                   — epoch-key decryption of the stored content
 *                               (recoverEpochKey is chain-aware and cached on
 *                               the RoomClient, so this is cheap per epoch);
 * - loadContent               — AFTER decryption, fetch external content for
 *                               Url/Ipfs/Irys/Arweave message types via the
 *                               same helper MessageClient.loadContent uses;
 * - loadParsedContent         — loadContent + envelope parse (and optional
 *                               packet-envelope decryption), like MessageClient.
 */
export class RoomMessageClient {
    private data?: RoomMessageData;
    private decrypted?: RoomMessageDecryptResult;
    private content?: RoomMessageContentLoadResult;
    private parsed?: ParsedPacketMessageContent;

    private constructor(
        private readonly client: PacketClient,
        private readonly roomClient: RoomClient,
        readonly address: PublicKey,
        data?: RoomMessageData,
    ) {
        this.data = data;
    }

    get Loaded(): boolean {
        return Boolean(this.data);
    }

    get Message(): RoomMessageData {
        if (!this.data) {
            throw new Error("Room message is not loaded");
        }

        return this.data;
    }

    /** Last decryption result, if decrypt() ran (undefined otherwise). */
    get Decrypted(): RoomMessageDecryptResult | undefined {
        return this.decrypted;
    }

    get Content(): RoomMessageContentLoadResult {
        if (!this.content) {
            throw new Error("Room message content is not loaded");
        }

        return this.content;
    }

    /** Last parsed content, if loadParsedContent() ran (undefined otherwise). */
    get Parsed(): ParsedPacketMessageContent | undefined {
        return this.parsed;
    }

    static Handle(params: {
        roomClient: RoomClient;
        address?: PublicKey;
        data?: RoomMessageData;
    }): RoomMessageClient {
        const address = params.address ?? params.data?.address;
        if (!address) {
            throw new Error("RoomMessageClient.Handle requires an address or message data");
        }

        return new RoomMessageClient(
            params.roomClient.packetClient,
            params.roomClient,
            address,
            params.data,
        );
    }

    /** Adopt already-fetched account data (e.g. from a bucket fetch). @internal */
    loadFromData(data: RoomMessageData): this {
        this.data = data;
        return this;
    }

    /** Prime the decryption cache (e.g. right after send). @internal */
    primeDecrypted(result: RoomMessageDecryptResult): this {
        this.decrypted = result;
        return this;
    }

    async load(force = false): Promise<this> {
        if (this.data && !force) {
            return this;
        }

        const account = await GetRoomMessageAccount(this.client, this.address);

        if (!account) {
            throw new Error(`Room message does not exist: ${this.address.toBase58()}`);
        }

        this.data = account;

        return this;
    }

    async loadRetrying(retries = 3, delay = 250): Promise<this> {
        for (let i = 0; i < retries; i++) {
            try {
                return await this.load();
            } catch (error) {
                if (i === retries - 1) {
                    throw error;
                }
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        return this;
    }

    async refresh(): Promise<this> {
        this.decrypted = undefined;
        this.content = undefined;
        this.parsed = undefined;
        return this.load(true);
    }

    /**
     * Decrypt the stored content with the message's epoch key
     * (roomClient.recoverEpochKey(cryptoEpoch) + decryptRoomMessageContent).
     *
     * The result is cached; "failed" results are NOT cached so a transient
     * failure can be retried. Never throws — failures come back typed.
     */
    async decrypt(force = false): Promise<RoomMessageDecryptResult> {
        await this.load();

        if (this.decrypted && !force) {
            return this.decrypted;
        }

        const message = this.Message;

        let epochKey: Awaited<ReturnType<RoomClient["recoverEpochKey"]>>;
        try {
            epochKey = await this.roomClient.recoverEpochKey(message.cryptoEpoch);
        } catch (err) {
            return {
                status: "failed",
                error: `epoch key recovery failed: ${err instanceof Error ? err.message : String(err)}`,
            };
        }

        if (epochKey.status !== "ok") {
            this.decrypted = { status: "locked" };
            return this.decrypted;
        }

        // PacketChat keeps the on-chain `content` PLAINTEXT (it's the public pointer
        // `https://api.packet.chat/message/{id}`); the privacy lives entirely in the
        // off-chain room-blob envelope at that pointer. So there is NO on-chain content
        // layer to decrypt — running the AES path would fail. We still required
        // recipient status above (a non-member reads "locked"); loadContent() then
        // fetches the plaintext pointer and loadParsedContent/decryptLoadedBody decodes
        // the off-chain envelope with the same epoch key.
        if (AnchorEnumToMessageType(message.messageType) === MessageType.PacketChat) {
            this.decrypted = {
                status: "decrypted",
                content: message.content,
                text: tryText(message.content),
            };
            return this.decrypted;
        }

        try {
            const plaintext = await decryptRoomMessageContent({
                messageEpochKey: epochKey.key,
                roomId: this.roomClient.roomId,
                clientMsgId: message.clientMsgId,
                content: message.content,
            });
            this.decrypted = {
                status: "decrypted",
                content: plaintext,
                text: tryText(plaintext),
            };
            return this.decrypted;
        } catch (err) {
            return {
                status: "failed",
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }

    /**
     * Load the message content AFTER decryption: inline for Text, fetched from
     * the gateway/url for Url/Ipfs/Irys/Arweave (same helper as
     * MessageClient.loadContent). Throws when the message cannot be decrypted
     * (check decrypt() first when "locked" is an expected outcome).
     */
    async loadContent(force = false): Promise<RoomMessageContentLoadResult> {
        if (this.content && !force) {
            return this.content;
        }

        const decrypted = await this.decrypt();
        if (decrypted.status !== "decrypted") {
            const detail = decrypted.status === "failed" ? `: ${decrypted.error}` : "";
            throw new Error(`cannot load room message content: message is ${decrypted.status}${detail}`);
        }

        const messageType = AnchorEnumToMessageType(this.Message.messageType);

        this.content = await loadPacketMessageContent({
            messageType,
            content: decrypted.content,
        });
        return this.content;
    }

    /**
     * Render-ready content. Two independent encryption layers are unwound:
     *   1. decrypt() — RoomMessage.content is epoch-encrypted to the pointer
     *      (pointer string for Url/Irys/Ipfs/Arweave, or inline text for Text).
     *   2. loadContent() — fetch the pointer (inline for Text), yielding the
     *      raw blob.
     *   3. off-chain decrypt — the fetched blob is either a room envelope
     *      (epoch-encrypted under the message's epoch) or a packet envelope
     *      encrypted to the reader, decrypted in turn.
     * The epoch layer (#1) protects the pointer on-chain; layer (#3) protects
     * the payload off-chain. The parsed result is cached on the handle.
     */
    async loadParsedContent(params: {
        decrypt?: boolean;
        force?: boolean;
    } = {}): Promise<ParsedPacketMessageContent> {
        if (this.parsed && !params.force) {
            return this.parsed;
        }

        const loaded = await this.loadContent(params.force);

        if (loaded.text === undefined) {
            const contentType = loaded.contentType ?? "application/octet-stream";
            const sizeKb = Math.round(loaded.bytes.byteLength / 1024);
            this.parsed = {
                message: `[binary ${contentType}, ~${sizeKb} KB]`,
                envelope: "",
                rawBytes: loaded.bytes,
                loadedContentType: loaded.contentType,
                loadedUrl: loaded.url,
                contentType: loaded.contentType,
                encrypted: false,
                mediaKind: "binary",
            };
            return this.parsed;
        }

        const decrypted = await this.decryptLoadedBody(loaded.text, params.decrypt);

        this.parsed = parseLoadedPacketMessageContent({
            loaded,
            plaintext: decrypted.plaintext,
            encrypted: decrypted.encrypted,
        });
        return this.parsed;
    }

    private async decryptLoadedBody(
        raw: string,
        decrypt?: boolean,
    ): Promise<{ encrypted: boolean; plaintext: string }> {
        if (decrypt === false) {
            return { encrypted: false, plaintext: raw };
        }
        // A JSON store (e.g. Irys application/json) round-trips the envelope
        // string wrapped in quotes; unwrap before detecting the envelope.
        const body = unwrapJsonString(raw);
        if (isRoomBlobEnvelope(body)) {
            const epochKey = await this.roomClient.recoverEpochKey(roomBlobEnvelopeEpoch(body));
            if (epochKey.status !== "ok") {
                throw new Error("not a recipient of this room message's epoch");
            }
            const plain = await decodeRoomBlobEnvelope({
                epochKey: epochKey.key,
                roomId: this.roomClient.roomId,
                envelope: body,
            });
            return { encrypted: true, plaintext: text(plain) };
        }
        return this.client.crypto.maybeDecrypt(body);
    }
}

function unwrapJsonString(value: string): string {
    const trimmed = value.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (typeof parsed === "string") return parsed;
        } catch {
            // not a JSON-wrapped string; use as-is
        }
    }
    return value;
}

function tryText(bytes: Bytes): string | undefined {
    try {
        return text(bytes);
    } catch {
        return undefined;
    }
}
