import type { Command } from "commander";
import { registerDecryptCommand } from "./decrypt.js";
import { registerEncryptCommand } from "./encrypt.js";

export const CommandCrypto = async (parent: Command) => {
  registerEncryptCommand(parent);
  registerDecryptCommand(parent);
};
