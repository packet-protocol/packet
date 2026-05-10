import type { PacketClient } from "../../../client";
import type { Message } from "../types";
import * as Pda from "../../../pda";
import { GetMessageAccount, MessageAccountToMessage } from "../account/get";
import type { ThreadClient } from "../../thread/client/thread";

export type MessageContentLoadResult = {
    kind: "inline" | "url";
    bytes: Uint8Array;
    text?: string;
};

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

        const address = Pda.messagePda(this.threadId, this.msgSeq);

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

        switch (message.messageType) {
            case 0: {
                this.content = {
                    kind: "inline",
                    bytes: message.content,
                    text: Buffer.from(message.content).toString("utf8"),
                };
                return this.content;
            }

            case 1:
            case 2:
            case 3:
            case 4: {
                let url = Buffer.from(message.content).toString("utf8");
                // Packet convention: content should be a URL. For older Irys-only
                // messages that stored just the tx id, fall back to the public gateway.
                if (!/^https?:\/\//.test(url)) {
                    if (message.messageType === 2) {
                        if (url.startsWith("ipfs://")) {
                            url = `https://ipfs.io/ipfs/${url.slice(7)}`;
                        } else {
                            url = `https://ipfs.io/ipfs/${url}`;
                        }
                    } else if (message.messageType === 3) {
                        if (url.startsWith("irys://")) {
                            url = `https://gateway.irys.xyz/${url.slice(7)}`;
                        } else if (url.startsWith("ar://")) {
                            url = `https://gateway.irys.xyz/${url.slice(5)}`;
                        }else {
                            url = `https://gateway.irys.xyz/${url}`;
                        }
                    } else if (message.messageType === 4) {
                        if (url.startsWith("ar://")) {
                            url = `https://arweave.net/${url.slice(5)}`;
                        } else {
                            url = `https://arweave.net/${url}`;
                        }
                    }
                }
                const res = await fetch(url);

                if (!res.ok) {
                    throw new Error(`Failed to load message content: ${res.status}`);
                }

                const bytes = new Uint8Array(await res.arrayBuffer());

                this.content = {
                    kind: "url",
                    bytes,
                    text: new TextDecoder().decode(bytes),
                };

                return this.content;
            }

            default:
                throw new Error(`Unsupported message type: ${message.messageType}`);
        }
    }
}