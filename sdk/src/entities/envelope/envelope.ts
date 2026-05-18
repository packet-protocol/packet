import type { PacketContent, PacketEnvelopeValue, PacketMail } from "./types";

type BuilderState =
    | { kind: "empty" }
    | { kind: "text"; value: string }
    | { kind: "content"; value: PacketContent }
    | { kind: "mail"; subject?: string; contents: PacketContent[] };

function isPacketContent(value: unknown): value is PacketContent {
    if (typeof value !== "object" || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.contentType === "string" &&
        (v.encoding === "base64" || v.encoding === "utf8") &&
        typeof v.content === "string"
    );
}

function isPacketMail(value: unknown): value is PacketMail {
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