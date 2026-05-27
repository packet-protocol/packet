import { Option, type Command } from "commander";
import { GetUserConfig } from "../config/get.js";
import { parseOptionalInteger, parsePublicKey, requiredString } from "../input/index.js";
import { useCliCrypto, loadReaderForOwner } from "./crypto.js";
import { buildWsolPayment } from "./payment.js";
import { prepareMessageContent, type SendInputSource } from "./content/index.js";
import { resolveTargetInbox, getThreadCounterparty } from "./resolve.js";
import { formatPayment } from "./format.js";
import { txOptions } from "../config/tx.js";
import type { BodyEncoding } from "xpkt-sdk";
import { buildCliPacketEnvelope, collectOption, stringList } from "../envelope/index.js";

type ResolvedSendInput = {
  source: SendInputSource;
  content: string;
  encoding: BodyEncoding;
  contentType: string; // MIME — "text/plain" for --content and --url
  filePaths?: string[];
  byteLength: number;
};

const readSendInput = async (options: any): Promise<ResolvedSendInput> => {
  const texts = stringList(options.text);
  const files = stringList(options.file);
  const hasEnvelopeParts = texts.length > 0 || files.length > 0;
  const hasContent = options.content != null;
  const hasUrl = options.url != null;
  const inputCount = Number(hasContent) + Number(hasUrl) + Number(hasEnvelopeParts);

  if (inputCount === 0) throw new Error("Missing input. Provide --content, --url, --text, or --file");
  if (inputCount > 1) throw new Error("Ambiguous input. Use --content, --url, or --text/--file envelope inputs");

  if (hasEnvelopeParts) {
    if (options.raw) {
      throw new Error("--raw cannot be combined with --text/--file envelope inputs");
    }
    const envelope = await buildCliPacketEnvelope({
      texts,
      files,
      subject: options.subject,
      fileContentType: options.fileContentType,
    });
    return {
      source: "envelope",
      filePaths: files,
      content: envelope.plaintext,
      encoding: "utf8",
      contentType: "application/json",
      byteLength: envelope.byteLength,
    };
  }

  if (hasUrl) {
    const content = requiredString(options.url, "--url");
    return {
      source: "url",
      content,
      encoding: "utf8",
      contentType: "text/plain",
      byteLength: Buffer.byteLength(content, "utf8"),
    };
  }

  const content = requiredString(options.content, "--content");
  return {
    source: "content",
    content,
    encoding: "utf8",
    contentType: "text/plain",
    byteLength: Buffer.byteLength(content, "utf8"),
  };
};

const addSendContentOptions = (cmd: Command) => {
  return cmd
    .option("--content <content>", "Inline message body, http(s) URL, ipfs:// URI, ar:// URI, or raw Irys/IPFS/Arweave id")
    .option("--url <url>", "Existing URL/Irys/IPFS/Arweave URL to send as pointer")
    .option("--text <message>", "Add a text/plain Packet envelope part", collectOption, [])
    .option("--subject <subject>", "Optional subject for --text/--file Packet envelope payloads")
    .option("--file <path>", "Add a file Packet envelope part", collectOption, [])
    .option("--file-content-type <mime>", "Override detected MIME type for --file")
    .option("--raw", "Send/upload exact --content instead of wrapping it in a PacketContent envelope", false)
    .option("--content-type <contentType>", "auto, text, url, irys, ipfs, or arweave", "auto")
    .option("--upload", "Upload --content or --text/--file envelope payload to Irys and send the resulting CID (default)", true)
    .option("--no-upload", "Send inline content or an existing pointer without uploading to Irys")
    .option("--encrypt", "Encrypt text/envelope/upload payload (default). Existing URL/Irys/IPFS/Arweave pointers stay pointers unless --upload is used", true)
    .option("--no-encrypt", "Send plaintext content without Packet encryption")
    .option("--payment-sol <amount>", "Attach a WSOL/SOL payment, e.g. 0.05")
    .option("--payment-to <pubkey>", "Payment destination owner ATA by default, or raw token account with --payment-to-raw")
    .option("--payment-to-raw", "Treat --payment-to as a token account address, not an owner", false)
    .option("--skip-preflight", "Skip transaction preflight", false)
    .option("--priority-fee <microLamports>", "Priority fee in micro lamports")
    .addOption(new Option("--ignore-warnings", "Proceed with sending even if there are warnings").default(false).hideHelp());
};

export const registerSendCommands = (parent: Command) => {
  addSendContentOptions(
    parent
      .command("new-thread")
      .description("Create a new thread and send the first message")
      .requiredOption("--to <pubkey>", "Recipient Solana public key")
      .option("--inbox <inbox>", "Recipient inbox id or inbox PDA address")
      .option("--thread <threadId>", "Optional explicit thread id")
  ).action(async (options) => {
    const { keypair, client, config } = GetUserConfig();
    useCliCrypto(client, keypair);

    const input = await readSendInput(options);

    const to = parsePublicKey(options.to, "--to");
    const targetInbox = await resolveTargetInbox({
      client,
      owner: to,
      inbox: options.inbox,
    });

    const shouldUpload = input.source === "url" ? false : options.upload !== false;
    const shouldEncrypt = input.source === "url" && !shouldUpload ? false : options.encrypt !== false;

    const readers = shouldEncrypt
      ? [await loadReaderForOwner(client, to)]
      : [];

    const prepared = await prepareMessageContent({
      keypair,
      config,
      client,
      source: input.source,
      content: input.content,
      subject: options.subject,
      raw: options.raw,
      upload: shouldUpload,
      encrypt: shouldEncrypt,
      readers,
      contentType: options.contentType,
      ignoreWarnings: options.ignoreWarnings,
      byteLength: input.byteLength,
      bodyEncoding: input.encoding,
      bodyContentType: input.contentType,
    });

    // If inbox has its own payment gate, let SDK resolve it from targetInbox.paymentRule.
    const manualPayment = targetInbox?.Inbox?.paymentRule
      ? undefined
      : buildWsolPayment(options, to);

    const res = await client.createThread({
      to,
      threadId: parseOptionalInteger(options.thread, "--thread"),
      targetInbox,
      messageType: prepared.messageType,
      content: prepared.content,
      payment: manualPayment,
      options: txOptions(options),
    });

    console.log("[OK] thread created and message sent");
    console.log("thread:", res.client.id);
    console.log("tx:", res.receipt.join(", "));
    console.log("content-source:", input.source);
    if (input.filePaths?.length) console.log("files:", input.filePaths.join(", "));
    console.log("content-type:", prepared.finalContentType);
    console.log("content:", prepared.content);
    if (prepared.uploaded) console.log("uploaded:", prepared.uploaded.url);
    if (prepared.encrypted) console.log("encrypted: yes");
    if (manualPayment) {
      console.log(
        "payment:",
        formatPayment({
          amount: manualPayment.amount,
          mint: manualPayment.mint,
          to,
        })
      );
    }
  });

  addSendContentOptions(
    parent
      .command("new")
      .description("Send a new message to an existing thread")
      .requiredOption("--thread <threadId>", "Existing thread id")
      .option("--disable-payment", "Disable payment even if the inbox has a payment rule", false)
  ).action(async (options) => {
    const { keypair, client, config } = GetUserConfig();
    useCliCrypto(client, keypair);

    const input = await readSendInput(options);

    const threadId = parseOptionalInteger(options.thread, "--thread")!;
    const thread = await client.thread(threadId).loadRetrying();
    const receiver = getThreadCounterparty(thread, client.walletPublicKey);

    const shouldUpload = input.source === "url" ? false : options.upload !== false;
    const shouldEncrypt = input.source === "url" && !shouldUpload ? false : options.encrypt !== false;

    const readers = shouldEncrypt
      ? [await loadReaderForOwner(client, receiver)]
      : [];

    const prepared = await prepareMessageContent({
      keypair,
      config,
      client,
      source: input.source,
      content: input.content,
      subject: options.subject,
      raw: options.raw,
      upload: shouldUpload,
      encrypt: shouldEncrypt,
      readers,
      contentType: options.contentType,
      ignoreWarnings: options.ignoreWarnings,
      byteLength: input.byteLength,
      bodyEncoding: input.encoding,
      bodyContentType: input.contentType,
    });

    const payment = buildWsolPayment(options, receiver);

    const res = await thread.sendMessage(
      {
        messageType: prepared.messageType,
        content: prepared.content,
        payment: options.disablePayment ? { disabled: true } : payment,
      },
      txOptions(options)
    );

    console.log("[OK] message sent");
    console.log("thread:", thread.id);
    console.log("seq:", res.client.msgSeq);
    console.log("tx:", res.receipt.join(", "));
    console.log("content-source:", input.source);
    if (input.filePaths?.length) console.log("files:", input.filePaths.join(", "));
    console.log("content-type:", prepared.finalContentType);
    console.log("content:", prepared.content);
    if (prepared.uploaded) console.log("uploaded:", prepared.uploaded.url);
    if (prepared.encrypted) console.log("encrypted: yes");
    if (payment && !options.disablePayment) {
      console.log(
        "payment:",
        formatPayment({
          amount: payment.amount,
          mint: payment.mint,
          to: receiver,
        })
      );
    }
  });
};
