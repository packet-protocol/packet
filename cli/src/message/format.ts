import { PublicKey } from "@solana/web3.js";
import { WSOL_ID } from "xpkt-sdk";
import { bnToString, lamportsToSolText } from "./parse.js";
import { loadMessageRawText, parsePacketEnvelopeText, rawMessageDisplay } from "./content.js";
import { maybeDecryptText } from "./crypto.js";

export function shortKey(key: PublicKey | string | undefined | null): string {
  if (!key) return "-";
  const s = typeof key === "string" ? key : key.toBase58();
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

export function formatDateFromUnix(seconds: number): string {
  if (!seconds) return "-";
  return new Date(seconds * 1000).toISOString();
}

export function formatPayment(payment: any): string {
  if (!payment) return "none";
  const mint = payment.mint?.toBase58?.() ?? String(payment.mint);
  const amount = mint === WSOL_ID.toBase58() ? `${lamportsToSolText(payment.amount)} SOL` : `${bnToString(payment.amount)} raw`;
  const to = payment.to?.toBase58?.() ?? String(payment.to ?? "-");
  return `${amount} -> ${shortKey(to)} (${mint === WSOL_ID.toBase58() ? "WSOL" : mint})`;
}

export function formatEscrow(escrow: any): string {
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
}

export function formatThreadInfo(thread: any): string {
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
}

export async function messageToPlainObject(params: {
  client: any;
  thread: any;
  message: any;
  decrypt: boolean;
  loadContent?: boolean;
}) {
  const msg = params.message.Message;
  const sender = msg.senderSide === 0 ? params.thread.Thread.from : params.thread.Thread.to;
  const rawPointer = rawMessageDisplay(params.message);

  let encrypted = false;
  let subject = "";
  let body = rawPointer.display;
  let loadedContent = false;
  let contentKind: "inline" | "pointer" | "loaded" = rawPointer.isPointer ? "pointer" : "inline";

  if (params.loadContent !== false) {
    const rawText = await loadMessageRawText(params.message);
    loadedContent = true;
    contentKind = "loaded";
    const decrypted = await maybeDecryptText(params.client, rawText, params.decrypt);
    encrypted = decrypted.encrypted;
    const payload = parsePacketEnvelopeText(decrypted.plaintext);
    subject = payload.subject ?? "";
    body = payload.message;
  } else if (!rawPointer.isPointer && params.decrypt) {
    const decrypted = await maybeDecryptText(params.client, rawPointer.raw, true);
    encrypted = decrypted.encrypted;
    const payload = parsePacketEnvelopeText(decrypted.plaintext);
    subject = payload.subject ?? "";
    body = payload.message;
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
    payment: msg.payment ? {
      amount: bnToString(msg.payment.amount),
      mint: msg.payment.mint.toBase58(),
      to: msg.payment.to.toBase58(),
      pretty: formatPayment(msg.payment),
    } : null,
  };
}

export function printJson(value: unknown) {
  console.log(JSON.stringify(value, (_key, val) => {
    if (val && typeof val === "object" && typeof val.toBase58 === "function") return val.toBase58();
    if (val && typeof val === "object" && typeof val.toString === "function" && val.constructor?.name === "BN") return val.toString();
    return val;
  }, 2));
}

export function printMessageItem(item: Awaited<ReturnType<typeof messageToPlainObject>>) {
  console.log(`\n#${item.seq} ${item.timestamp} ${shortKey(item.sender)} ${item.messageType} ${item.encrypted ? "[encrypted]" : "[plain]"} ${item.loadedContent ? "[loaded]" : "[raw]"}`);
  if (item.subject) console.log(`subject: ${item.subject}`);
  console.log(item.message);
  if (item.payment) console.log(`payment: ${item.payment.pretty}`);
}

export function printRawEventLine(params: {
  event: any;
  message: any;
}) {
  const msg = params.message.Message;
  const raw = rawMessageDisplay(params.message);
  const sender = params.event.sender?.toBase58?.() ?? "-";
  const receiver = params.event.receiver?.toBase58?.() ?? "-";
  const sig = params.event.signature ? ` sig=${params.event.signature}` : "";
  console.log(`[event] thread=${params.event.threadId} seq=${params.event.msgSeq} type=${raw.messageType} sender=${shortKey(sender)} receiver=${shortKey(receiver)} slot=${params.event.slot}${sig} content=${raw.display}`);
  if (msg.payment) console.log(`        payment=${formatPayment(msg.payment)}`);
}
