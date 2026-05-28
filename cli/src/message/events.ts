import type { Command } from "commander";
import { GetUserConfig } from "../config/get.js";
import { parseOptionalInteger, parseOptionalPublicKey, parsePublicKey } from "../input/index.js";
import { useCliCrypto } from "./crypto.js";
import { InboxSize, printRawEventLine } from "./format.js";
import { resolveTargetInbox } from "./resolve.js";
import type { InboxChangedEvent, InboxClient, MessageClient, PacketMessageSentEvent } from "xpkt-sdk";

const toPositiveCount = (value: unknown): number => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) throw new Error("--count must be 0 or a positive number");
  return Math.floor(n);
};

export const registerEventsCommands = (parent: Command) => {
  parent
    .command("events",)
    .description("Listen to live Packet message events and print raw message content/pointers. (if no filters are set, it defaults to --incoming)")
    .option("--thread <threadId>", "Only listen to one thread")
    .option("--incoming", "Only incoming messages for current wallet", false)
    .option("--outgoing", "Only outgoing messages from current wallet", false)
    .option("--sender <pubkey>", "Filter by sender")
    .option("--receiver <pubkey>", "Filter by receiver")
    .option("--count <n>", "Stop after n events. 0 means run until Ctrl+C", "0")
    .action(async (options) => {
      const { client } = GetUserConfig();

      const threadId = parseOptionalInteger(options.thread, "--thread");
      const sender = parseOptionalPublicKey(options.sender, "--sender");
      const receiver = parseOptionalPublicKey(options.receiver, "--receiver");
      const count = toPositiveCount(options.count);

      let seen = 0;
      let sub: { stop: () => Promise<void> } | undefined;

      const stop = async () => {
        if (sub) await sub.stop().catch(() => undefined);
      };

      const onMessage = async (client: MessageClient, event: PacketMessageSentEvent) => {
        try {
          console.log("\n[event] new message event:", { msgSeq: event.msgSeq, threadId: event.threadId });
          // This loads only the compressed message account. It does NOT fetch URL/Irys body and does NOT decrypt.
          await client.loadRetrying(5, 500);
          printRawEventLine({ event, message: client });
        } catch (err) {
          console.error("[event:error]", err instanceof Error ? err.message : String(err));
        }

        seen += 1;
        if (count > 0 && seen >= count) {
          await stop();
          process.exit(0);
        }
      };

      const params = {
        sender,
        receiver,
        onMessage,
        onError: (err: unknown) => console.error("[events:error]", err instanceof Error ? err.message : String(err)),
      };

      if (threadId !== undefined) {
        sub = client.messageEvents.listenThread(threadId, params);
      } else if (options.outgoing) {
        sub = client.messageEvents.listenOutgoing(params);
      } else {  // default to listening to incoming if no thread or outgoing filter is set, to avoid too much noise
        sub = client.messageEvents.listenIncoming(params);
      }

      console.log("[OK] listening for message events. Ctrl+C to stop.");

      process.once("SIGINT", async () => {
        await stop();
        process.exit(0);
      });

      // Keep the CLI alive. The listener itself is websocket-based.
      await new Promise<void>(() => undefined);
    });

  parent
    .command("events-inbox")
    .description("Listen to live inbox change events for threads in the inbox and print raw message content/pointers. (cheaper than `events` since it only looks for inbox account")
    .argument("<inbox>", "Inbox id for --owner, or inbox PDA address")
    .option("--owner <pubkey>", "Inbox owner when <inbox> is numeric", undefined)
    .option("--count <n>", "Stop after n events. 0 means run until Ctrl+C", "0")
    .action(async (inboxArg, options) => {
      const { client } = GetUserConfig();

      const owner = options.owner ? parsePublicKey(options.owner, "--owner") : client.walletPublicKey;
      const inbox = await resolveTargetInbox({ client, owner, inbox: inboxArg });
      if (!inbox) throw new Error("Inbox not found");


      var inboxLen = InboxSize(inbox.Inbox.index.toNumber(), inbox.Inbox.len.toNumber());

      const count = toPositiveCount(options.count);

      let seen = 0;
      let sub: { stop: () => Promise<void> } | undefined;

      const stop = async () => {
        if (sub) await sub.stop().catch(() => undefined);
      };
      const onChange = async (client: InboxClient, _event: InboxChangedEvent) => {
        try {
          var newLen = InboxSize(client.Inbox.index.toNumber(), client.Inbox.len.toNumber());
          if (newLen === inboxLen) return; // sometimes we get events that don't actually change the length. Ignore those.
          console.log(`\n[event] inbox changed event. previousLen=${inboxLen} newLen=${newLen}`);
          inboxLen = newLen;
        } catch (err) {
          console.error("[event:error]", err instanceof Error ? err.message : String(err));
        }

        seen += 1;
        if (count > 0 && seen >= count) {
          await stop();
          process.exit(0);
        }
      }

      sub = inbox.listenEvents({
        onChange: onChange,
        onError: (err: unknown) => console.error("[events:error]", err instanceof Error ? err.message : String(err)),
      });

      console.log("[OK] listening for inbox events. Ctrl+C to stop.");

      process.once("SIGINT", async () => {
        await stop();
        process.exit(0);
      });

      await new Promise<void>(() => undefined);
    })
};
