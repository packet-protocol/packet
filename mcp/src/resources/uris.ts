export type PacketResourceRef =
    | { kind: "activity" }
    | { kind: "thread"; thread: string }
    | { kind: "inbox"; inbox: string; owner?: string };

export const parsePacketResourceUri = (raw: string): PacketResourceRef => {
    let uri: URL;
    try {
        uri = new URL(raw);
    } catch {
        throw new Error(`Invalid Packet resource URI: ${raw}`);
    }

    if (uri.protocol !== "packet:") {
        throw new Error(`Unsupported resource URI scheme: ${uri.protocol}`);
    }

    const parts = uri.pathname.split("/").filter(Boolean);

    if (uri.hostname === "activity" && parts.length === 0) {
        return { kind: "activity" };
    }

    if (uri.hostname === "thread" && parts.length === 1) {
        return { kind: "thread", thread: parts[0]! };
    }

    if (uri.hostname === "inbox" && parts.length === 1) {
        return { kind: "inbox", inbox: parts[0]! };
    }

    if (uri.hostname === "inbox" && parts.length === 2) {
        return { kind: "inbox", owner: parts[0]!, inbox: parts[1]! };
    }

    throw new Error(`Unsupported Packet resource URI: ${raw}`);
};

export const packetActivityUri = "packet://activity";
export const packetThreadUri = (thread: number | string) => `packet://thread/${thread}`;
export const packetInboxUri = (inbox: number | string, owner?: string) => {
    return owner ? `packet://inbox/${owner}/${inbox}` : `packet://inbox/${inbox}`;
};
