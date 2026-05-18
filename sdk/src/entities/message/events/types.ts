import type { PublicKey } from "@solana/web3.js";
import type { MessageClient } from "../client/message";

export type PacketMessageSentEventRaw = {
    threadId: number;
    msgSeq: number;
    sender: PublicKey;
    receiver: PublicKey;
};

export type PacketMessageSentEvent = {
    threadId: number;
    msgSeq: number;

    /**
     * Actual sender of this message.
     * This can be either thread.from or thread.to.
     */
    sender: PublicKey;

    /**
     * Actual receiver of this message.
     * This is the opposite party for this message.
     */
    receiver: PublicKey;

    slot: number;
    signature?: string;
};

export type MessageListenerFilter = {
    threadId?: number;
    sender?: PublicKey;
    receiver?: PublicKey;

    /**
     * Convenience filter for current user's incoming messages.
     */
    incomingFor?: PublicKey;

    /**
     * Convenience filter for current user's outgoing messages.
     */
    outgoingFrom?: PublicKey;
};

export type ListenMessagesParams = MessageListenerFilter & {
    onMessage: (client: MessageClient, event: PacketMessageSentEvent) => void | Promise<void>;
    onError?: (error: unknown) => void;

    /**
     * Anchor event name. Usually "MessageSent".
     * Keep override for generated-IDL weirdness.
     */
    eventName?: "messageSent";
};

export type PacketEventSubscription = {
    id: number;
    stop: () => Promise<void>;
};