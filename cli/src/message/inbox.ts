import type { Command } from "commander";
import { InboxKind } from "xpkt-sdk";
import { GetUserConfig } from "../config/get.js";
import { buildInboxWsolPaymentRule } from "./payment.js";
import { parseOptionalInteger, parsePublicKey, requiredString } from "../input/index.js";
import { formatPayment, printJson, shortKey } from "./format.js";
import { resolveTargetInbox } from "./resolve.js";
import { txOptions } from "../config/tx.js";

const addInboxPaymentOptions = (cmd: Command) => {
  return cmd
    .option("--payment-sol <amount>", "Enable SOL/WSOL payment wall, e.g. 0.05")
    .option("--payment-to <pubkey>", "Payment destination owner ATA by default, or raw token account with --payment-to-raw")
    .option("--payment-to-raw", "Treat --payment-to as a token account address, not an owner", false)
    .option("--escrow", "Escrow inbox payments instead of paying receiver immediately", false);
};

const addTxOptions = (cmd: Command) => {
  return cmd
    .option("--skip-preflight", "Skip transaction preflight", false)
    .option("--priority-fee <microLamports>", "Priority fee in micro lamports")
    .option("--json", "Print JSON output", false);
};

export const registerInboxCommands = (parent: Command) => {
  addTxOptions(addInboxPaymentOptions(
    parent
      .command("create-inbox")
      .description("Create a Packet inbox, optionally with a WSOL payment wall and escrow")
      .option("--inbox <inboxId>", "Inbox id", "0")
      .option("--name <name>", "Inbox display name")
      .option("--uri <uri>", "Inbox metadata URI", "")
      .option("--ephemeral", "Create ephemeral inbox instead of standard", false)
  )).action(async (options) => {
    const { client } = GetUserConfig();
    const inboxId = parseOptionalInteger(options.inbox, "--inbox") ?? 0;
    const name = options.name ? requiredString(options.name, "--name") : "";
    const uri = typeof options.uri === "string" ? options.uri : "";

    const payment = buildInboxWsolPaymentRule(options, client.walletPublicKey);

    const res = await client.createInbox({
      inboxId,
      inboxKind: options.ephemeral ? InboxKind.Ephemeral : InboxKind.Standard,
      metadata: name ? { name, uri } : undefined,
      payment,
      options: txOptions(options),
    });

    const inbox = res.client;
    await inbox.loadMetadata().catch(() => inbox);

    if (options.json) {
      return printJson({
        tx: res.receipt,
        inbox: {
          address: inbox.address.toBase58(),
          id: inbox.id.toString(),
          owner: inbox.owner.toBase58(),
          kind: inbox.Inbox.kind,
          name: inbox.Metadata?.name ?? "",
          uri: inbox.Metadata?.uri ?? "",
          paymentRule: inbox.Inbox.paymentRule,
        },
      });
    }

    console.log("[OK] inbox created");
    console.log("id:", inbox.id.toString());
    console.log("address:", inbox.address.toBase58());
    console.log("owner:", inbox.owner.toBase58());
    console.log("kind:", options.ephemeral ? "ephemeral" : "standard");
    console.log("metadata:", name ? `${name} ${uri ? `(${uri})` : ""}` : "none");
    console.log("payment wall:", inbox.Inbox.paymentRule ? formatPayment(inbox.Inbox.paymentRule.inner) : "none");
    console.log("escrow:", inbox.Inbox.paymentRule?.escrow ? "yes" : "no");
    console.log("tx:", res.receipt.join(", "));
  });

  addTxOptions(addInboxPaymentOptions(
    parent
      .command("edit-inbox-payment")
      .description("Edit or clear an inbox WSOL payment wall")
      .argument("<inbox>", "Inbox id for --owner, or inbox PDA address")
      .option("--owner <pubkey>", "Inbox owner when <inbox> is numeric")
      .option("--clear-payment", "Remove payment wall", false)
  )).action(async (inboxArg, options) => {
    const { client } = GetUserConfig();
    const owner = options.owner ? parsePublicKey(options.owner, "--owner") : client.walletPublicKey;
    const inbox = await resolveTargetInbox({ client, owner, inbox: inboxArg });
    if (!inbox) throw new Error("Inbox not found");

    const payment = options.clearPayment ? null : buildInboxWsolPaymentRule(options, client.walletPublicKey);
    if (!options.clearPayment && !payment) throw new Error("Provide --payment-sol or --clear-payment");

    const res = await inbox.editPayment({
      payment,
      options: txOptions(options),
    });

    await res.client.refresh({ clearPages: false }).catch(() => res.client);

    if (options.json) {
      return printJson({
        tx: res.receipt,
        inbox: {
          address: res.client.address.toBase58(),
          id: res.client.id.toString(),
          owner: res.client.owner.toBase58(),
          paymentRule: res.client.Inbox.paymentRule,
        },
      });
    }

    console.log("[OK] inbox payment updated");
    console.log("inbox:", `${res.client.id.toString()} ${shortKey(res.client.address)}`);
    console.log("payment wall:", res.client.Inbox.paymentRule ? formatPayment(res.client.Inbox.paymentRule.inner) : "none");
    console.log("escrow:", res.client.Inbox.paymentRule?.escrow ? "yes" : "no");
    console.log("tx:", res.receipt.join(", "));
  });
};
