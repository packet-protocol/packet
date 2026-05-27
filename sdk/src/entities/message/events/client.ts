import type { PublicKey } from "@solana/web3.js";

import type { PacketClient } from "../../../client";
import type {
    ListenMessagesParams,
    PacketMessageSentEvent,
    PacketMessageSentEventRaw,
} from "./types";
import { MessageClient, ThreadClient } from "../..";
import type { PacketEventSubscription } from "../../events/types";

const pubkeyEq = (a?: PublicKey, b?: PublicKey): boolean => {
    if (!a || !b) return false;
    return a.equals(b);
}

const normalizeMessageSentEvent = (
    event: PacketMessageSentEventRaw,
    slot: number,
    signature?: string,
): PacketMessageSentEvent => {
    return {
        threadId: Number(event.threadId),
        msgSeq: Number(event.msgSeq),
        sender: event.sender,
        receiver: event.receiver,
        slot,
        signature,
    };
}

const matchesFilter = (
    event: PacketMessageSentEvent,
    params: ListenMessagesParams,
): boolean => {
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
     * Listen to live MessageSent Anchor emit_cpi! events.
     *
     * live websocket subscription, not a historical indexer.
     * 
     * More optimized and less rpc intensive than [`MessageEventsClient`] because it targets
     * specific inbox accounts instead of subscribing to all messages and filtering client-side. 
     */
    listen(params: ListenMessagesParams): PacketEventSubscription {
        const eventName = params.eventName ?? "messageSent";

        return this.client.cpiEvents.listen<
            PacketMessageSentEventRaw,
            PacketMessageSentEvent
        >({
            eventName: [eventName],

            commitment: params.commitment,
            maxRetries: params.maxRetries,

            parse: (rawEvent, ctx) => {
                return normalizeMessageSentEvent(
                    rawEvent,
                    ctx.slot,
                    ctx.signature,
                );
            },

            filter: (event) => matchesFilter(event, params),

            onEvent: async (event) => {
                try {
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

            onError: params.onError,
        });
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