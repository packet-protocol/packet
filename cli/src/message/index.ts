import type { Command } from "commander";
import { registerSendCommands } from "./send.js";
import { registerReadCommands } from "./read.js";
import { registerEscrowCommands } from "./escrow.js";
import { registerInboxCommands } from "./inbox.js";
import { registerEventsCommands } from "./events.js";

/**
 * Register on your `message` command group.
 *
 * Example:
 *   const message = program.command("message");
 *   await CommandMessage(message);
 */
export const CommandMessage = async (parent: Command) => {
  registerSendCommands(parent);
  registerInboxCommands(parent);
  registerReadCommands(parent);
  registerEscrowCommands(parent);
  registerEventsCommands(parent);
};
