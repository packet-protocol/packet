import { PublicKey } from "@solana/web3.js";
import { InboxClient, MessageClient, PacketClient, parsePacketEnvelopeText, ThreadClient, WSOL_ID, type PacketMessageSentEvent } from "xpkt-sdk";
import { saveEnvelopeBinaryParts, type SavedEnvelopeFile } from "../envelope/index.js";
import { bnToString, lamportsToSolText } from "../input/index.js";
import { rawMessageDisplay } from "./content/index.js";
import { maybeDecryptText } from "./crypto.js";

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
  fullViewDir?: string;
}) => {
  const msg = params.message.Message;
  const sender = msg.senderSide === 0 ? params.thread.Thread.from : params.thread.Thread.to;
  const rawPointer = rawMessageDisplay(params.message);

  let encrypted = false;
  let subject = "";
  let body = rawPointer.display;
  let loadedContent = false;
  let contentKind: "inline" | "pointer" | "loaded" = rawPointer.isPointer ? "pointer" : "inline";
  let savedFiles: SavedEnvelopeFile[] = [];

  if (params.loadContent !== false) {
    const payload = await params.message.loadParsedContent({ decrypt: params.decrypt });
    loadedContent = true;
    contentKind = "loaded";
    encrypted = payload.encrypted;
    subject = payload.subject ?? "";
    body = payload.message;
    savedFiles = await saveEnvelopeBinaryParts({
      dir: params.fullViewDir,
      payload,
      fileStem: (index) => `thread-${msg.threadId}-msg-${msg.msgSeq}-part-${index + 1}`,
    });
  } else if (!rawPointer.isPointer && params.decrypt) {
    const decrypted = await maybeDecryptText(params.client, rawPointer.raw, true);
    encrypted = decrypted.encrypted;
    const payload = parsePacketEnvelopeText(decrypted.plaintext);
    subject = payload.subject ?? "";
    body = payload.message;
    savedFiles = await saveEnvelopeBinaryParts({
      dir: params.fullViewDir,
      payload,
      fileStem: (index) => `thread-${msg.threadId}-msg-${msg.msgSeq}-part-${index + 1}`,
    });
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
    savedFiles,
    payment: msg.payment ? {
      amount: bnToString(msg.payment.amount),
      mint: msg.payment.mint.toBase58(),
      to: msg.payment.to.toBase58(),
      pretty: formatPayment(msg.payment),
    } : null,
  };
};

export const printJson = (value: unknown) => {
  console.log(JSON.stringify(value, (_key, val) => {
    if (val && typeof val === "object" && typeof val.toBase58 === "function") return val.toBase58();
    if (val && typeof val === "object" && typeof val.toString === "function" && val.constructor?.name === "BN") return val.toString();
    return val;
  }, 2));
};

export const printMessageItem = (item: Awaited<ReturnType<typeof messageToPlainObject>>) => {
  console.log(`\n#${item.seq} ${item.timestamp} ${shortKey(item.sender)} ${item.messageType} ${item.encrypted ? "[encrypted]" : "[plain]"} ${item.loadedContent ? "[loaded]" : "[raw]"}`);
  if (item.subject) console.log(`subject: ${item.subject}`);
  console.log(item.message);
  for (const file of item.savedFiles) {
    console.log(`saved: ${file.path} (${file.contentType}, ${file.bytes} bytes)`);
  }
  if (item.payment) console.log(`payment: ${item.payment.pretty}`);
};

export const printRawEventLine = (params: {
  event: PacketMessageSentEvent;
  message: MessageClient;
}) => {
  const msg = params.message.Message;
  const raw = rawMessageDisplay(params.message);
  const sender = params.event.sender?.toBase58?.() ?? "-";
  const receiver = params.event.receiver?.toBase58?.() ?? "-";
  const sig = params.event.signature ? ` sig=${params.event.signature}` : "";
  console.log(`[event] thread=${params.event.threadId} seq=${params.event.msgSeq} type=${raw.messageType} sender=${shortKey(sender)} receiver=${shortKey(receiver)} slot=${params.event.slot}${sig} content=${raw.display}`);
  if (msg.payment) console.log(`        payment=${formatPayment(msg.payment)}`);
};

export const InboxSize = (index:number, currentLen: number) => {

  if (index === 0) return currentLen;
  return currentLen + index * InboxClient.InboxSegmentSize.toNumber();

}