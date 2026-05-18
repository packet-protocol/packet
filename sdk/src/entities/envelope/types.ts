import type { BodyEncoding } from "../../crypto/types/common";

export type PacketMail = {
    subject?: string;
    message: PacketContent | PacketContent[] | string;
}

export type PacketContent = {
    contentType: string;
    encoding: BodyEncoding;
    content: string;
}

export type PacketEnvelopeValue = PacketMail | PacketContent | string;