import type { BodyEncoding } from "../../crypto/types/common.js";

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

export type BuildPacketEnvelopePayloadParams = {
    content: string;
    contentType: string;
    encoding: BodyEncoding;
    subject?: string;
    raw?: boolean;
};

export type ParsedPacketEnvelopeText = {
    subject?: string;
    message: string;
    envelope: PacketEnvelopeValue;
    parts?: PacketContent[];
    contentType?: string;
    encoding?: BodyEncoding;
};
