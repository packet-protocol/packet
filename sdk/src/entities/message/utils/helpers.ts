import { MessageType } from "../types.js";
import * as anchor from "@anchor-lang/core";
import type { PacketIDL } from "../../../idl/packet.idl.js";
export const MessageTypeToAnchorEnum = (msgType: MessageType): anchor.IdlTypes<PacketIDL>["messageType"] => {
    switch (msgType) {
        case MessageType.Text:
            return { text: {} };
        case MessageType.Url:
            return { url: {} };
        case MessageType.Ipfs:
            return { ipfs: {} };    
        case MessageType.Irys:
            return { irys: {} };
        case MessageType.Arweave:
            return { arweave: {} };
        case MessageType.PacketChat:
            return { packetChat: {} };
        default:
            throw new Error("Unsupported message type");
    }
}

export const AnchorEnumToMessageType = (anchorEnum: anchor.IdlTypes<PacketIDL>["messageType"]): MessageType => {
    if ("text" in anchorEnum) {
        return MessageType.Text;
    } else if ("url" in anchorEnum) {
        return MessageType.Url;
    } else if ("ipfs" in anchorEnum) {
        return MessageType.Ipfs;
    } else if ("irys" in anchorEnum) {
        return MessageType.Irys;
    } else if ("arweave" in anchorEnum) {
        return MessageType.Arweave;
    } else if ("packetChat" in anchorEnum) {
        return MessageType.PacketChat;
    } else {
        throw new Error("Unsupported message type");
    }
}