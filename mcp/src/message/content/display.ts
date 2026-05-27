import { appendPacketGatewayIfNeeded, MessageClient, packetMessageTypeName } from "xpkt-sdk";

export const loadMessageRawText = async (message: MessageClient): Promise<string> => {
  const loaded = await message.loadContent();
  return loaded.text ?? `[binary ${loaded.contentType ?? "application/octet-stream"}, ~${Math.round(loaded.bytes.byteLength / 1024)} KB]`;
};

export const rawMessageContentText = (message: any): string => {
  const content = message?.Message?.content ?? message?.content;
  if (!content) return "";
  if (typeof content === "string") return content;
  return new TextDecoder().decode(content instanceof Uint8Array ? content : new Uint8Array(content));
};

export const rawMessageDisplay = (message: any): {
  raw: string;
  display: string;
  messageType: string;
  isPointer: boolean;
} => {
  const msg = message?.Message ?? message;
  const raw = rawMessageContentText(message);
  const display = appendPacketGatewayIfNeeded(msg?.messageType, raw);
  const type = packetMessageTypeName(msg?.messageType);

  return {
    raw,
    display,
    messageType: type,
    isPointer: type === "url" || type === "irys" || type === "arweave" || type === "ipfs",
  };
};
