import type { Command } from "commander";
import { registerConfigInitCommand } from "./init.js";
import { registerConfigViewCommand } from "./view.js";
import { registerConfigWhoAmICommand } from "./whoami.js";

export const CommandConfig = async (parent: Command) => {
  registerConfigInitCommand(parent);
  registerConfigViewCommand(parent);
  registerConfigWhoAmICommand(parent);
};
