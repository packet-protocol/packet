import type { Payment } from "../payment/types";

export interface Message {
    threadId: number,
    msgSeq: number,
    senderSide: MessageSenderSide,
    timestamp: number,
    payment: Payment | null,
    messageType: MessageType,
    content: Buffer
}

/**
 * Position of user in thread (0 for from, 1 for to)
 */
export enum MessageSenderSide {
  From = 0,
  To = 1,
}

export enum MessageType {
  Text = 0,
  Url = 1,
  Ipfs = 2,
  Irys = 3,
  Arweave = 4,
}