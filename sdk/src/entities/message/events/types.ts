import type { Finality, PublicKey } from "@solana/web3.js";
import type { MessageClient } from "../client/message.js";


export type MessageListenerFilter = {
    threadId?: number;
    sender?: PublicKey;
    receiver?: PublicKey;
    incomingFor?: PublicKey;
    outgoingFrom?: PublicKey;
};

export type ListenMessagesParams = MessageListenerFilter & {
    onMessage: (
        client: MessageClient,
        event: PacketMessageSentEvent,
    ) => void | Promise<void>;

    onError?: (error: unknown) => void;

    eventName?: "messageSent" | string;

    commitment?: Finality;
    maxRetries?: number;
};

export type PacketMessageSentEvent = {
    threadId: number;
    msgSeq: number;
    sender: PublicKey;
    receiver: PublicKey;
    slot: number;
    signature?: string;
};

export type PacketMessageSentEventRaw = {
    threadId: number;
    msgSeq: number;
    sender: PublicKey;
    receiver: PublicKey;
};