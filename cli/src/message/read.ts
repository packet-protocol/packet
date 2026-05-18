import type { Command } from "commander";
import { InboxClient } from "xpkt-sdk";
import { GetUserConfig } from "../config/get.js";
import { parseOptionalInteger, parsePublicKey } from "./parse.js";
import { useCliCrypto } from "./crypto.js";
import { resolveTargetInbox } from "./resolve.js";
import { formatEscrow, formatPayment, formatThreadInfo, messageToPlainObject, printJson, printMessageItem, shortKey } from "./format.js";

function readOptions(cmd: Command) {
  return cmd
    .option("--no-decrypt", "Do not decrypt message content")
    .option("--no-load-content", "Do not fetch URL/Irys/Arweave/IPFS body; print pointer/raw content only")
    .option("--json", "Print JSON output", false);
}

export function registerReadCommands(parent: Command) {
  parent
    .command("inboxes")
    .description("List my inboxes")
    .option("--json", "Print JSON output", false)
    .action(async (options) => {
      const { keypair, client } = GetUserConfig();
      useCliCrypto(client, keypair);

      const inboxes = await InboxClient.LoadMultiple({ client });
      await Promise.all(inboxes.map((i) => i.loadMetadata().catch(() => i)));

      const rows = inboxes.map((inbox) => ({
        address: inbox.address.toBase58(),
        id: inbox.id.toString(),
        owner: inbox.owner.toBase58(),
        name: inbox.Metadata?.name ?? "",
        uri: inbox.Metadata?.uri ?? "",
        len: inbox.len.toString(),
        currentIndex: inbox.currentIndex.toString(),
        lastUpdated: inbox.Inbox.lastUpdated,
        paymentRule: inbox.Inbox.paymentRule ? formatPayment(inbox.Inbox.paymentRule.inner) : null,
        escrow: inbox.Inbox.paymentRule?.escrow ? true : false,
      }));

      if (options.json) return printJson(rows);
      for (const row of rows) {
        console.log(`${row.id} ${shortKey(row.address)} ${row.name || "-"} threads=${row.len} payment=${row.paymentRule ?? "none"}`);
      }
    });

  readOptions(
    parent
      .command("inbox")
      .description("Load an inbox and show threads + last messages")
      .argument("<inbox>", "Inbox id for --owner, or inbox PDA address")
      .option("--owner <pubkey>", "Inbox owner when <inbox> is numeric", undefined)
      .option("--limit <n>", "Thread count", "25")
      .option("--max-pages <n>", "Max inbox archive pages to scan", "5")
  ).action(async (inboxArg, options) => {
    const { keypair, client } = GetUserConfig();
    useCliCrypto(client, keypair);

    const owner = options.owner ? parsePublicKey(options.owner, "--owner") : client.walletPublicKey;
    const inbox = await resolveTargetInbox({ client, owner, inbox: inboxArg });
    if (!inbox) throw new Error("Inbox not found");
    await inbox.loadMetadata().catch(() => inbox);

    const limit = Number(options.limit ?? 25);
    const threads = await inbox.loadThreadsAcrossBodies({
      includeLastMessage: true,
      limit,
      maxPages: Number(options.maxPages ?? 5),
    });

    const out = [];
    for (const thread of threads) {
      const t = thread.Thread;
      let last: any = null;
      if (thread.LastMessage) {
        last = await messageToPlainObject({ client, thread, message: thread.LastMessage, decrypt: options.decrypt !== false, loadContent: options.loadContent !== false });
      }
      out.push({
        id: t.id,
        from: t.from.toBase58(),
        to: t.to.toBase58(),
        lastUpdated: t.lastUpdated,
        totalMsgs: t.totalMsgs,
        escrow: t.escrowPayment ? formatEscrow(t.escrowPayment) : null,
        lastMessage: last,
      });
    }

    if (options.json) return printJson({
      inbox: {
        address: inbox.address.toBase58(),
        id: inbox.id.toString(),
        owner: inbox.owner.toBase58(),
        name: inbox.Metadata?.name ?? "",
        len: inbox.len.toString(),
        paymentRule: inbox.Inbox.paymentRule,
      },
      threads: out,
    });

    console.log(`inbox ${inbox.id.toString()} ${shortKey(inbox.address)} owner=${shortKey(inbox.owner)} name=${inbox.Metadata?.name ?? "-"}`);
    console.log(`paymentRule=${inbox.Inbox.paymentRule ? formatPayment(inbox.Inbox.paymentRule.inner) : "none"}`);
    for (const row of out) {
      console.log(`\nthread ${row.id} ${shortKey(row.from)} -> ${shortKey(row.to)} msgs=${row.totalMsgs} last=${row.lastUpdated}`);
      if (row.escrow) console.log(`escrow: ${row.escrow}`);
      if (row.lastMessage) printMessageItem(row.lastMessage);
    }
  });

  readOptions(
    parent
      .command("activity")
      .description("Load my activity threads + last messages")
      .option("--limit <n>", "Thread count", "25")
      .option("--max-pages <n>", "Max activity pages to scan", "5")
  ).action(async (options) => {
    const { keypair, client } = GetUserConfig();
    useCliCrypto(client, keypair);

    const activity = await client.activity(client.walletPublicKey).load();
    const threads = await activity.loadThreadsAcrossHistory({
      includeLastMessage: true,
      limit: Number(options.limit ?? 25),
      maxPages: Number(options.maxPages ?? 5),
    });

    const out = [];
    for (const thread of threads) {
      const t = thread.Thread;
      const last = thread.LastMessage
        ? await messageToPlainObject({ client, thread, message: thread.LastMessage, decrypt: options.decrypt !== false, loadContent: options.loadContent !== false })
        : null;
      out.push({ id: t.id, from: t.from.toBase58(), to: t.to.toBase58(), lastUpdated: t.lastUpdated, totalMsgs: t.totalMsgs, lastMessage: last });
    }

    if (options.json) return printJson(out);
    for (const row of out) {
      console.log(`\nthread ${row.id} ${shortKey(row.from)} -> ${shortKey(row.to)} msgs=${row.totalMsgs} last=${row.lastUpdated}`);
      if (row.lastMessage) printMessageItem(row.lastMessage);
    }
  });

  parent
    .command("thread")
    .description("Show thread info")
    .requiredOption("--thread <threadId>", "Thread id")
    .option("--json", "Print JSON output", false)
    .action(async (options) => {
      const { keypair, client } = GetUserConfig();
      useCliCrypto(client, keypair);

      const thread = await client.thread(parseOptionalInteger(options.thread, "--thread")!).loadRetrying();
      if (options.json) return printJson(thread.Thread);
      console.log(formatThreadInfo(thread));
    });

  readOptions(
    parent
      .command("messages")
      .description("Load messages from a thread")
      .requiredOption("--thread <threadId>", "Thread id")
      .option("--limit <n>", "Message count", "50")
      .option("--from-seq <seq>", "Start seq")
      .option("--direction <direction>", "backward or forward", "backward")
  ).action(async (options) => {
    const { keypair, client } = GetUserConfig();
    useCliCrypto(client, keypair);

    const thread = await client.thread(parseOptionalInteger(options.thread, "--thread")!).loadRetrying();
    const messages = await thread.loadMessages({
      limit: Number(options.limit ?? 50),
      fromSeq: parseOptionalInteger(options.fromSeq, "--from-seq"),
      direction: options.direction === "forward" ? "forward" : "backward",
    });
    messages.sort((a: any, b: any) => a.msgSeq - b.msgSeq);

    const out = [];
    for (const message of messages) {
      out.push(await messageToPlainObject({ client, thread, message, decrypt: options.decrypt !== false, loadContent: options.loadContent !== false }));
    }

    if (options.json) return printJson(out);
    for (const item of out) printMessageItem(item);
  });

  readOptions(
    parent
      .command("last")
      .description("Load last message from a thread")
      .requiredOption("--thread <threadId>", "Thread id")
  ).action(async (options) => {
    const { keypair, client } = GetUserConfig();
    useCliCrypto(client, keypair);

    const thread = await client.thread(parseOptionalInteger(options.thread, "--thread")!).loadRetrying();
    const message = await thread.loadLastMessage();
    if (!message) {
      console.log("No messages");
      return;
    }

    const out = await messageToPlainObject({ client, thread, message, decrypt: options.decrypt !== false, loadContent: options.loadContent !== false });
    if (options.json) return printJson(out);
    printMessageItem(out);
  });
}
