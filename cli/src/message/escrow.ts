import type { Command } from "commander";
import { GetUserConfig } from "../config/get.js";
import { parseOptionalInteger, parseOptionalPublicKey } from "./parse.js";
import { useCliCrypto } from "./crypto.js";

export function registerEscrowCommands(parent: Command) {
  const escrow = parent.command("escrow").description("Thread escrow actions");

  escrow
    .command("approve")
    .description("Approve thread escrow")
    .requiredOption("--thread <threadId>", "Thread id")
    .action(async (options) => {
      const { keypair, client } = GetUserConfig();
      useCliCrypto(client, keypair);

      const thread = await client.thread(parseOptionalInteger(options.thread, "--thread")!).loadRetrying();
      const res = await thread.approveEscrow();
      console.log("[OK] escrow approved");
      console.log("tx:", res.receipt.join(", "));
    });

  escrow
    .command("withdraw")
    .description("Withdraw released thread escrow")
    .requiredOption("--thread <threadId>", "Thread id")
    .option("--receiver-token-account <pubkey>", "Receiver token account override")
    .action(async (options) => {
      const { keypair, client } = GetUserConfig();
      useCliCrypto(client, keypair);

      const thread = await client.thread(parseOptionalInteger(options.thread, "--thread")!).loadRetrying();
      const res = await thread.withdrawEscrow({
        receiverTokenAccount: parseOptionalPublicKey(options.receiverTokenAccount, "--receiver-token-account"),
      });
      console.log("[OK] escrow withdrawn");
      console.log("tx:", res.receipt.join(", "));
    });
}
