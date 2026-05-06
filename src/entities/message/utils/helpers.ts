import { MessageType } from "../types";
import * as anchor from "@coral-xyz/anchor";
import type { PacketIDL } from "../../../idl/packet.idl";
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
    } else {
        throw new Error("Unsupported message type");
    }
}