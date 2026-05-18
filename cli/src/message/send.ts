import { Option, type Command } from "commander";
import { GetUserConfig } from "../config/get.js";
import { parseOptionalInteger, parsePublicKey, requiredString } from "./parse.js";
import { useCliCrypto, loadReaderForOwner } from "./crypto.js";
import { buildWsolPayment } from "./payment.js";
import { prepareMessageContent } from "./content.js";
import { resolveTargetInbox, getThreadCounterparty } from "./resolve.js";
import { formatPayment } from "./format.js";
import { txOptions } from "../config/tx.js";
import type { BodyEncoding } from "xpkt-sdk";
import { readFileAsPayload } from "../helpers/file.js";

export type SendInputSource = "content" | "url" | "file";

type ResolvedSendInput = {
  source: SendInputSource;
  content: string;
  encoding: BodyEncoding;
  contentType: string; // MIME — "text/plain" for --content and --url
  filePath?: string;
  byteLength: number;
};

async function readSendInput(options: any): Promise<ResolvedSendInput> {
  const hasFile = options.file != null;
  const hasContent = options.content != null;
  const hasUrl = options.url != null;
  const inputCount = Number(hasContent) + Number(hasUrl) + Number(hasFile);

  if (inputCount === 0) throw new Error("Missing input. Provide one of: --content, --url, or --file");
  if (inputCount > 1) throw new Error("Ambiguous input. Use only one of: --content, --url, or --file");

  if (hasFile) {
    if (options.raw) {
      throw new Error(
        "--raw cannot be combined with --file. Files need an envelope to carry their MIME type and encoding. Drop --raw, or use --content with the text you want to send bare."
      );
    }
    const filePath = String(options.file);
    const payload = await readFileAsPayload(filePath, options.fileContentType);
    return {
      source: "file",
      filePath,
      content: payload.content,
      encoding: payload.encoding,
      contentType: payload.contentType,
      byteLength: payload.byteLength,
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
}

function addSendContentOptions(cmd: Command) {
  return cmd
    .option("--content <content>", "Inline message body, http(s) URL, ipfs:// URI, ar:// URI, or raw Irys/IPFS/Arweave id")
    .option("--url <url>", "Existing URL/Irys/IPFS/Arweave URL to send as pointer")
    .option("--subject <subject>", "Optional subject, FE-compatible JSON envelope for text/upload payloads")
    .option("--file <path>", "Read message body from a file. Use with --upload to upload the file payload to Irys")
    .option("--file-content-type <mime>", "Override detected MIME type for --file")
    .option("--raw", "Send/upload exact content instead of JSON {subject,message} envelope", false)
    .option("--content-type <contentType>", "auto, text, url, irys, ipfs, or arweave", "auto")
    .option("--upload", "Upload --content/--file payload to Irys and send the resulting CID (Irys only)", false)
    .option("--encrypt", "Encrypt text/upload payload. Existing URL/Irys/IPFS/Arweave pointers stay pointers unless --upload is used", false)
    .option("--payment-sol <amount>", "Attach a WSOL/SOL payment, e.g. 0.05")
    .option("--payment-to <pubkey>", "Payment destination owner ATA by default, or raw token account with --payment-to-raw")
    .option("--payment-to-raw", "Treat --payment-to as a token account address, not an owner", false)
    .option("--skip-preflight", "Skip transaction preflight", false)
    .option("--priority-fee <microLamports>", "Priority fee in micro lamports")
    .addOption(new Option("--ignore-warnings", "Proceed with sending even if there are warnings").default(false).hideHelp());
}

export function registerSendCommands(parent: Command) {
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

    const readers = options.encrypt
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
      upload: options.upload,
      encrypt: options.encrypt,
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
      options: await txOptions(options, client.connection),
    });

    console.log("[OK] thread created and message sent");
    console.log("thread:", res.client.id);
    console.log("tx:", res.receipt.join(", "));
    console.log("content-source:", input.source);
    if (input.filePath) console.log("file:", input.filePath);
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

    const readers = options.encrypt
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
      upload: options.upload,
      encrypt: options.encrypt,
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
      await txOptions(options, client.connection)
    );

    console.log("[OK] message sent");
    console.log("thread:", thread.id);
    console.log("seq:", res.client.msgSeq);
    console.log("tx:", res.receipt.join(", "));
    console.log("content-source:", input.source);
    if (input.filePath) console.log("file:", input.filePath);
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
}