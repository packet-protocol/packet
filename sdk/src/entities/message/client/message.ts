import type { PacketClient } from "../../../client";
import type { Message } from "../types";
import * as Pda from "../../../pda";
import { GetMessageAccount, MessageAccountToMessage } from "../account/get";
import type { ThreadClient } from "../../thread/client/thread";
import {
    loadPacketMessageContent,
    parseLoadedPacketMessageContent,
    type PacketLoadedContent,
    type ParsedPacketMessageContent,
} from "../content";

export type MessageContentLoadResult = PacketLoadedContent;

export class MessageClient {
    private message?: Message;
    private content?: MessageContentLoadResult;

    private constructor(
        private readonly client: PacketClient,
        readonly threadId: number,
        readonly msgSeq: number,
        public thread?: ThreadClient,
    ) { }

    get Loaded(): boolean {
        return Boolean(this.message);
    }

    get Message(): Message {
        if (!this.message) {
            throw new Error("Message is not loaded");
        }

        return this.message;
    }

    get Content(): MessageContentLoadResult {
        if (!this.content) {
            throw new Error("Message content is not loaded");
        }

        return this.content;
    }

    static Handle(params: {
        client: PacketClient;
        threadId: number;
        msgSeq: number;
        thread?: ThreadClient;
    }): MessageClient {
        return new MessageClient(
            params.client,
            params.threadId,
            params.msgSeq,
            params.thread ?? params.client.thread(params.threadId)
        );
    }

    async load(force = false): Promise<this> {
        if (this.message && !force) {
            return this;
        }

        const address = Pda.messagePda(this.threadId, this.msgSeq, this.client.program.programId);

        const account = await GetMessageAccount(
            this.client.lightRpc,
            this.client.program,
            address,
        );

        if (!account) {
            throw new Error(`Message does not exist: ${this.threadId}/${this.msgSeq}`);
        }

        this.message = MessageAccountToMessage(account.data);

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
        this.content = undefined;
        return this.load(true);
    }

    /**
     * Loads external content if message content points to URL/IPFS/Irys/Arweave.
     */
    async loadContent(force = false): Promise<MessageContentLoadResult> {
        await this.load();

        if (this.content && !force) {
            return this.content;
        }

        const message = this.Message;
        this.content = await loadPacketMessageContent({
            messageType: message.messageType,
            content: message.content,
        });
        return this.content;
    }

    async loadParsedContent(params: {
        decrypt?: boolean;
        force?: boolean;
    } = {}): Promise<ParsedPacketMessageContent> {
        const loaded = await this.loadContent(params.force);

        if (loaded.text === undefined) {
            const contentType = loaded.contentType ?? "application/octet-stream";
            const sizeKb = Math.round(loaded.bytes.byteLength / 1024);
            return {
                message: `[binary ${contentType}, ~${sizeKb} KB]`,
                envelope: "",
                rawBytes: loaded.bytes,
                loadedContentType: loaded.contentType,
                loadedUrl: loaded.url,
                contentType: loaded.contentType,
                encrypted: false,
                mediaKind: "binary",
            };
        }

        const decrypted = params.decrypt === false
            ? { encrypted: false as const, plaintext: loaded.text }
            : await this.client.crypto.maybeDecrypt(loaded.text);

        return parseLoadedPacketMessageContent({
            loaded,
            plaintext: decrypted.plaintext,
            encrypted: decrypted.encrypted,
        });
    }
}
