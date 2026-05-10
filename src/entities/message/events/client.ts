import type { PublicKey } from "@solana/web3.js";

import type { PacketClient } from "../../../client";
import type {
    ListenMessagesParams,
    PacketEventSubscription,
    PacketMessageSentEvent,
    PacketMessageSentEventRaw,
} from "./types";
import { MessageClient, ThreadClient } from "../..";

function pubkeyEq(a?: PublicKey, b?: PublicKey): boolean {
    if (!a || !b) return false;
    return a.equals(b);
}

function normalizeMessageSentEvent(
    event: PacketMessageSentEventRaw,
    slot: number,
    signature?: string,
): PacketMessageSentEvent {
    return {
        threadId: Number(event.threadId),
        msgSeq: Number(event.msgSeq),
        sender: event.sender,
        receiver: event.receiver,
        slot,
        signature,
    };
}

function matchesFilter(
    event: PacketMessageSentEvent,
    params: ListenMessagesParams,
): boolean {
    if (params.threadId !== undefined && event.threadId !== params.threadId) {
        return false;
    }

    if (params.sender && !pubkeyEq(event.sender, params.sender)) {
        return false;
    }

    if (params.receiver && !pubkeyEq(event.receiver, params.receiver)) {
        return false;
    }

    if (params.incomingFor && !pubkeyEq(event.receiver, params.incomingFor)) {
        return false;
    }

    if (params.outgoingFrom && !pubkeyEq(event.sender, params.outgoingFrom)) {
        return false;
    }

    return true;
}

export class MessageEventsClient {
    constructor(private readonly client: PacketClient) {}

    /**
     * Listen to live messageSent Anchor events.
     *
     * This is a live websocket subscription, not a historical indexer.
     * Use it for UI updates like "new message arrived".
     */
    listen(params: ListenMessagesParams): PacketEventSubscription {
        const eventName = params.eventName ?? "messageSent";

        const id = this.client.program.addEventListener(
            eventName,
            async (
                rawEvent: PacketMessageSentEventRaw,
                slot: number,
                signature?: string,
            ) => {
                try {
                    const event = normalizeMessageSentEvent(
                        rawEvent,
                        slot,
                        signature,
                    );

                    if (!matchesFilter(event, params)) {
                        return;
                    }

                    const message = MessageClient.Handle({
                        client: this.client,
                        threadId: event.threadId,
                        msgSeq: event.msgSeq,
                        thread: ThreadClient.Handle({
                            client: this.client,
                            id: event.threadId,
                        }),
                    });
                    
                    await params.onMessage(message, event);
                } catch (err) {
                    params.onError?.(err);
                }
            },
        );

        return {
            id,
            stop: async () => {
                await this.client.program.removeEventListener(id);
            },
        };
    }

    /**
     * Listen to all messages received by the current wallet.
     */
    listenIncoming(
        params: Omit<ListenMessagesParams, "incomingFor">,
    ): PacketEventSubscription {
        return this.listen({
            ...params,
            incomingFor: this.client.walletPublicKey,
        });
    }

    /**
     * Listen to all messages sent by the current wallet.
     */
    listenOutgoing(
        params: Omit<ListenMessagesParams, "outgoingFrom">,
    ): PacketEventSubscription {
        return this.listen({
            ...params,
            outgoingFrom: this.client.walletPublicKey,
        });
    }

    /**
     * Listen to messages in a single thread.
     */
    listenThread(
        threadId: number,
        params: Omit<ListenMessagesParams, "threadId">,
    ): PacketEventSubscription {
        return this.listen({
            ...params,
            threadId,
        });
    }
}