import { Command } from "commander";
import { readConfigSync } from "./get.js";

/**
 * `packet config view` command.
 * 
 * Usage:
 *   packet config view
 */
export const registerConfigViewCommand = (parent: Command): void => {
    parent
        .command("view")
        .description("View Packet CLI configuration")
        .action(async () => {
            const config = readConfigSync();
            console.log(config);
        });
};
