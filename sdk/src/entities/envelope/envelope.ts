import type {
    BuildPacketEnvelopePayloadParams,
    PacketContent,
    PacketEnvelopeValue,
    PacketMail,
    ParsedPacketEnvelopeText,
} from "./types.js";

type BuilderState =
    | { kind: "empty" }
    | { kind: "text"; value: string }
    | { kind: "content"; value: PacketContent }
    | { kind: "mail"; subject?: string; contents: PacketContent[] };

export function isPacketContent(value: unknown): value is PacketContent {
    if (typeof value !== "object" || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.contentType === "string" &&
        (v.encoding === "base64" || v.encoding === "utf8") &&
        typeof v.content === "string"
    );
}

export function isPacketMail(value: unknown): value is PacketMail {
    if (typeof value !== "object" || value === null) return false;
    const v = value as Record<string, unknown>;
    if (v.subject !== undefined && typeof v.subject !== "string") return false;
    if (v.message === undefined) return false;
    if (typeof v.message === "string") return true;
    if (Array.isArray(v.message)) {
        return v.message.length > 0 && v.message.every(isPacketContent);
    }
    return isPacketContent(v.message);
}

export function isPacketEnvelopeValue(value: unknown): value is PacketEnvelopeValue {
    return typeof value === "string" || isPacketContent(value) || isPacketMail(value);
}

export class PacketEnvelope {
    private state: BuilderState = { kind: "empty" };

    text(value: string): this {
        if (this.state.kind !== "empty") {
            throw new Error("PacketEnvelope: text() can only be called on an empty builder");
        }
        this.state = { kind: "text", value };
        return this;
    }

    mail(subject?: string): this {
        if (this.state.kind !== "empty") {
            throw new Error("PacketEnvelope: mail() can only be called on an empty builder");
        }
        this.state = { kind: "mail", subject, contents: [] };
        return this;
    }

    content(content: PacketContent): this {
        if (this.state.kind === "empty") {
            this.state = { kind: "content", value: content };
            return this;
        }
        if (this.state.kind === "mail") {
            this.state.contents.push(content);
            return this;
        }
        if (this.state.kind === "content") {
            throw new Error(
                "PacketEnvelope: cannot chain multiple content() calls without mail() — call mail() first to build a multi-content envelope"
            );
        }
        throw new Error("PacketEnvelope: content() cannot follow text()");
    }

    build(): PacketEnvelopeValue {
        switch (this.state.kind) {
            case "empty":
                throw new Error("PacketEnvelope: nothing to build — call text(), content(), or mail() first");
            case "text":
                return this.state.value;
            case "content":
                return this.state.value;
            case "mail": {
                if (this.state.contents.length === 0) {
                    throw new Error("PacketEnvelope: mail() requires at least one content() call");
                }
                const message =
                    this.state.contents.length === 1
                        ? this.state.contents[0]
                        : this.state.contents;
                const mail: PacketMail = { message };
                if (this.state.subject !== undefined) {
                    mail.subject = this.state.subject;
                }
                return mail;
            }
        }
    }

    encode(): string {
        const value = this.build();
        if (typeof value === "string") return value;
        return JSON.stringify(value);
    }

    static decode(raw: string): PacketEnvelopeValue {
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            return raw;
        }

        if (isPacketMail(parsed)) return parsed;
        if (isPacketContent(parsed)) return parsed;
        if (typeof parsed === "string") return parsed;

        throw new Error("PacketEnvelope: parsed JSON does not match any known variant");
    }
}

export function buildPacketEnvelopePayload(params: BuildPacketEnvelopePayloadParams): string {
    const envelope = new PacketEnvelope();

    if (params.raw && !params.subject && params.encoding === "utf8" && params.contentType === "text/plain") {
        return envelope.text(params.content).encode();
    }

    const part: PacketContent = {
        contentType: params.contentType,
        encoding: params.encoding,
        content: params.content,
    };

    if (params.subject) return envelope.mail(params.subject).content(part).encode();
    return envelope.content(part).encode();
}

export function parsePacketEnvelopeText(raw: string): ParsedPacketEnvelopeText {
    let envelope: PacketEnvelopeValue;

    try {
        envelope = PacketEnvelope.decode(raw);
    } catch {
        return { message: raw, envelope: raw };
    }

    if (typeof envelope === "string") {
        return { message: envelope, envelope };
    }

    if (isPacketMail(envelope)) {
        const message = envelope.message;

        if (typeof message === "string") {
            return {
                subject: envelope.subject,
                message,
                envelope,
            };
        }

        const parts = Array.isArray(message) ? message : [message];
        return {
            subject: envelope.subject,
            message: parts.map(renderPacketContent).join("\n\n"),
            envelope,
            parts,
            contentType: parts[0]?.contentType,
            encoding: parts[0]?.encoding,
        };
    }

    return {
        message: renderPacketContent(envelope),
        envelope,
        parts: [envelope],
        contentType: envelope.contentType,
        encoding: envelope.encoding,
    };
}

export function isTextualMime(mime: string | undefined | null): boolean {
    if (!mime) return false;
    const m = mime.split(";")[0]!.trim().toLowerCase();
    if (m.startsWith("text/")) return true;
    if (m === "image/svg+xml") return true;
    if (m === "application/json") return true;
    if (m === "application/xml") return true;
    if (m === "application/yaml" || m === "application/x-yaml") return true;
    if (m === "application/javascript" || m === "application/typescript") return true;
    if (m.endsWith("+json") || m.endsWith("+xml")) return true;
    return false;
}

export function renderPacketContent(part: PacketContent): string {
    if (part.encoding === "utf8") return part.content;

    if (isTextualMime(part.contentType)) {
        try {
            return new TextDecoder().decode(packetContentBytes(part));
        } catch {
            return part.content;
        }
    }

    const sizeKb = Math.round((part.content.length * 3) / 4 / 1024);
    return `[binary ${part.contentType}, ~${sizeKb} KB base64]`;
}

export function packetContentBytes(part: PacketContent): Uint8Array {
    return part.encoding === "base64" ? base64ToBytes(part.content) : new TextEncoder().encode(part.content);
}

function base64ToBytes(value: string): Uint8Array {
    if (typeof atob === "function") {
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    return Uint8Array.from(Buffer.from(value, "base64"));
}
