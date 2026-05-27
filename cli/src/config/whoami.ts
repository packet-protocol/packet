import { Command } from "commander";
import { GetUserConfig } from "./get.js";

/**
 * `packet config view` command.
 * 
 * Usage:
 *   packet config whoami
 */
export const registerConfigWhoAmICommand = (parent: Command): void => {
    parent
        .command("whoami")
        .description("View the current user wallet public key")
        .action(async () => {
            const config = GetUserConfig();
            console.log(config.wallet.publicKey.toBase58());
        });
};
