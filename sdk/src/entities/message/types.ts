import type { Payment } from "../payment/types.js";

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
  /**
   * Native PacketChat room message. The message PAYLOAD is fully end-to-end
   * encrypted with the room's BGW per-epoch key — same room/epoch mechanics as any
   * xpkt room message. The difference from Url/Irys is only WHERE the ciphertext
   * lives: here the on-chain `content` is just a PLAINTEXT pointer
   * (`https://api.packet.chat/message/{id}`), and the actual ciphertext is the
   * off-chain room-blob envelope (`packet:room:v1:…`) fetched from that pointer —
   * sealed with `roomBlobKey = sha256("xpkt-room-blob-key-v1", epochKey, roomId,
   * epoch)` (AES-GCM, AAD bound to room+epoch). Url/Irys instead epoch-encrypt the
   * ON-CHAIN pointer itself, so for PacketChat the SDK skips
   * `decryptRoomMessageContent` (the pointer is already plaintext) and decrypts the
   * fetched blob via `decodeRoomBlobEnvelope`. Net: privacy is identical; only the
   * pointer URL is public on-chain. Matches the on-chain program's
   * `MessageType::PacketChat` (index 5).
   */
  PacketChat = 5,
}