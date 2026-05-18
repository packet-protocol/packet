import type { Command } from "commander";
import { GetUserConfig } from "../config/get.js";
import { parseOptionalInteger, parseOptionalPublicKey } from "./parse.js";
import { useCliCrypto } from "./crypto.js";
import { printRawEventLine } from "./format.js";

function toPositiveCount(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) throw new Error("--count must be 0 or a positive number");
  return Math.floor(n);
}

/**
 * Unstable: This command doesn't work as we intented yet. So it's hidden and not documented until we have a chance to improve it.
*/
export function registerEventsCommands(parent: Command) {
  parent
    .command("events", { hidden: true })
    .description("Listen to live Packet message events and print raw message content/pointers")
    .option("--thread <threadId>", "Only listen to one thread")
    .option("--incoming", "Only incoming messages for current wallet", false)
    .option("--outgoing", "Only outgoing messages from current wallet", false)
    .option("--sender <pubkey>", "Filter by sender")
    .option("--receiver <pubkey>", "Filter by receiver")
    .option("--count <n>", "Stop after n events. 0 means run until Ctrl+C", "0")
    .action(async (options) => {
      const { keypair, client } = GetUserConfig();
      // Not used for decrypting here, but keeps the client/session aligned with the rest of the CLI.
      useCliCrypto(client, keypair);

      const threadId = parseOptionalInteger(options.thread, "--thread");
      const sender = parseOptionalPublicKey(options.sender, "--sender");
      const receiver = parseOptionalPublicKey(options.receiver, "--receiver");
      const count = toPositiveCount(options.count);

      let seen = 0;
      let sub: { stop: () => Promise<void> } | undefined;

      const stop = async () => {
        if (sub) await sub.stop().catch(() => undefined);
      };

      const onMessage = async (message: any, event: any) => {
        try {
          // This loads only the compressed message account. It does NOT fetch URL/Irys body and does NOT decrypt.
          await message.loadRetrying(5, 500);
          printRawEventLine({ event, message });
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
      } else if (options.incoming) {
        sub = client.messageEvents.listenIncoming(params);
      } else if (options.outgoing) {
        sub = client.messageEvents.listenOutgoing(params);
      } else {
        sub = client.messageEvents.listen(params);
      }

      console.log("[OK] listening for message events. Ctrl+C to stop.");

      process.once("SIGINT", async () => {
        await stop();
        process.exit(0);
      });

      // Keep the CLI alive. The listener itself is websocket-based.
      await new Promise<void>(() => undefined);
    });
}
