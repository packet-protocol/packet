import { PublicKey } from "@solana/web3.js";
import {
  isTextualMime,
  InboxClient,
  MessageClient,
  PacketClient,
  packetContentBytes,
  parsePacketEnvelopeText,
  ThreadClient,
  type PacketContent,
  type ParsedPacketEnvelopeText,
  WSOL_ID,
} from "xpkt-sdk";
import { bnToString, lamportsToSolText } from "../input/index.js";
import { maybeDecryptText } from "./crypto.js";
import { rawMessageDisplay } from "./content/index.js";

export type McpContentBlock =
  | { type: "text"; text: string }
  | { type: "resource"; resource: { uri: string; mimeType?: string; text: string } | { uri: string; mimeType?: string; blob: string } };

export const shortKey = (key: PublicKey | string | undefined | null): string => {
  if (!key) return "-";
  const s = typeof key === "string" ? key : key.toBase58();
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
};

export const formatDateFromUnix = (seconds: number): string => {
  if (!seconds) return "-";
  return new Date(seconds * 1000).toISOString();
};

export const formatPayment = (payment: any): string => {
  if (!payment) return "none";
  const mint = payment.mint?.toBase58?.() ?? String(payment.mint);
  const amount = mint === WSOL_ID.toBase58() ? `${lamportsToSolText(payment.amount)} SOL` : `${bnToString(payment.amount)} raw`;
  const to = payment.to?.toBase58?.() ?? String(payment.to ?? "-");
  return `${amount} -> ${shortKey(to)} (${mint === WSOL_ID.toBase58() ? "WSOL" : mint})`;
};

export const formatEscrow = (escrow: any): string => {
  if (!escrow) return "none";
  const mint = escrow.mint?.toBase58?.() ?? String(escrow.mint);
  const amount = mint === WSOL_ID.toBase58() ? `${lamportsToSolText(escrow.amount)} SOL` : `${bnToString(escrow.amount)} raw`;
  return [
    `amount=${amount}`,
    `mint=${mint}`,
    `senderApproval=${Boolean(escrow.senderApproval)}`,
    `receiverApproval=${Boolean(escrow.receiverApproval)}`,
    `released=${Boolean(escrow.released)}`,
    `releaseTime=${bnToString(escrow.releaseTime)}`,
    `releaseSeconds=${bnToString(escrow.escrow?.releaseSeconds)}`,
  ].join(" ");
};

export const formatThreadInfo = (thread: any): string => {
  const t = thread.Thread ?? thread;
  return [
    `thread=${t.id}`,
    `address=${t.address?.toBase58?.() ?? "-"}`,
    `from=${t.from?.toBase58?.() ?? "-"}`,
    `to=${t.to?.toBase58?.() ?? "-"}`,
    `inboxId=${bnToString(t.inboxId)}`,
    `totalMsgs=${t.totalMsgs}`,
    `lastMsgSeq=${t.lastMsgSeq}`,
    `lastUpdated=${formatDateFromUnix(t.lastUpdated)}`,
    `escrow=${formatEscrow(t.escrowPayment)}`,
  ].join("\n");
};

export const messageToPlainObject = async (params: {
  client: PacketClient;
  thread: ThreadClient;
  message: MessageClient;
  decrypt: boolean;
  loadContent?: boolean;
}) => {
  const msg = params.message.Message;
  const sender = msg.senderSide === 0 ? params.thread.Thread.from : params.thread.Thread.to;
  const rawPointer = rawMessageDisplay(params.message);

  let encrypted = false;
  let subject = "";
  let body = rawPointer.display;
  let loadedContent = false;
  let contentKind: "inline" | "pointer" | "loaded" = rawPointer.isPointer ? "pointer" : "inline";
  let packet: ParsedPacketEnvelopeText | null = null;

  if (params.loadContent !== false) {
    const payload = await params.message.loadParsedContent({ decrypt: params.decrypt });
    loadedContent = true;
    contentKind = "loaded";
    encrypted = payload.encrypted;
    subject = payload.subject ?? "";
    body = payload.message;
    packet = payload;
  } else if (!rawPointer.isPointer && params.decrypt) {
    const decrypted = await maybeDecryptText(params.client, rawPointer.raw, true);
    encrypted = decrypted.encrypted;
    const payload = parsePacketEnvelopeText(decrypted.plaintext);
    subject = payload.subject ?? "";
    body = payload.message;
    packet = payload;
  }

  return {
    threadId: msg.threadId,
    seq: msg.msgSeq,
    senderSide: msg.senderSide,
    sender: sender.toBase58(),
    timestamp: formatDateFromUnix(msg.timestamp),
    messageType: rawPointer.messageType,
    contentKind,
    loadedContent,
    encrypted,
    subject,
    message: body,
    rawContent: rawPointer.raw,
    displayContent: rawPointer.display,
    resources: packetContentResources(packet?.parts, `packet://thread/${msg.threadId}/message/${msg.msgSeq}`),
    payment: msg.payment ? {
      amount: bnToString(msg.payment.amount),
      mint: msg.payment.mint.toBase58(),
      to: msg.payment.to.toBase58(),
      pretty: formatPayment(msg.payment),
    } : null,
  };
};

export const messageText = (item: Awaited<ReturnType<typeof messageToPlainObject>>): string => {
  const lines = [
    `#${item.seq} ${item.timestamp} ${shortKey(item.sender)} ${item.messageType} ${item.encrypted ? "[encrypted]" : "[plain]"} ${item.loadedContent ? "[loaded]" : "[raw]"}`,
  ];
  if (item.subject) lines.push(`subject: ${item.subject}`);
  lines.push(item.message);
  if (item.payment) lines.push(`payment: ${item.payment.pretty}`);
  return lines.join("\n");
};

export const packetContentResources = (parts: PacketContent[] | undefined, baseUri = "packet://envelope"): McpContentBlock[] => {
  if (!parts) return [];

  return parts
    .filter((part) => !isTextualMime(part.contentType))
    .map((part, index) => {
      const bytes = packetContentBytes(part);
      return {
        type: "resource" as const,
        resource: {
          uri: `${baseUri}/part-${index + 1}${extensionForMime(part.contentType)}`,
          mimeType: part.contentType,
          blob: Buffer.from(bytes).toString("base64"),
        },
      };
    });
};

export const rawEventObject = (params: {
  event: any;
  message: MessageClient;
}) => {
  const msg = params.message.Message;
  const raw = rawMessageDisplay(params.message);
  const sender = params.event.sender?.toBase58?.() ?? "-";
  const receiver = params.event.receiver?.toBase58?.() ?? "-";

  return {
    threadId: params.event.threadId,
    seq: params.event.msgSeq,
    messageType: raw.messageType,
    sender,
    receiver,
    slot: params.event.slot,
    signature: params.event.signature ?? null,
    content: raw.display,
    rawContent: raw.raw,
    payment: msg.payment ? {
      amount: bnToString(msg.payment.amount),
      mint: msg.payment.mint.toBase58(),
      to: msg.payment.to.toBase58(),
      pretty: formatPayment(msg.payment),
    } : null,
  };
};

export const rawEventText = (row: ReturnType<typeof rawEventObject>): string => {
  const sig = row.signature ? ` sig=${row.signature}` : "";
  const lines = [
    `[event] thread=${row.threadId} seq=${row.seq} type=${row.messageType} sender=${shortKey(row.sender)} receiver=${shortKey(row.receiver)} slot=${row.slot}${sig} content=${row.content}`,
  ];
  if (row.payment) lines.push(`payment=${row.payment.pretty}`);
  return lines.join("\n");
};

export const inboxSize = (index: number, currentLen: number): number => {
  if (index === 0) return currentLen;
  return currentLen + index * InboxClient.InboxSegmentSize.toNumber();
};

export const jsonText = (value: unknown): string => {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === "object" && typeof val.toBase58 === "function") return val.toBase58();
    if (val && typeof val === "object" && typeof val.toString === "function" && val.constructor?.name === "BN") return val.toString();
    return val;
  }, 2);
};

const extensionForMime = (contentType: string): string => {
  const mime = contentType.split(";")[0]!.trim().toLowerCase();
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "application/pdf":
      return ".pdf";
    case "application/zip":
      return ".zip";
    default:
      return ".bin";
  }
};
