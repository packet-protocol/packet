import { Command } from "commander";
import { ConfigFolderPath, ConfigPath, WalletPath } from "../constants.js";
import { SetUserConfig } from "./set.js";

/**
 * `packet config` command.
 *
 * Three valid invocations:
 *
 *   1. Import a new private key (Packet manages it):
 *      packet config --rpc <url> --private-key <base58>
 *
 *   2. Point at an existing Solana keypair file (no key ever touches Packet):
 *      packet config --rpc <url> --keypair ~/.config/solana/id.json
 *
 *   3. Update RPC only, reusing the existing wallet:
 *      packet config --rpc <url>
 *      (works only after the user has set a wallet at least once)
 */
export const CommandInit = (parent: Command): void => {
  parent
    .command("config")
    .description("Configure Packet CLI (RPC and wallet)")
    .requiredOption("--rpc <url>", "Photon Solana RPC URL")
    .option(
      "--private-key <key>",
      "Solana private key in base58 format (imports the key into Packet)"
    )
    .option(
      "--keypair <path>",
      "Path to an existing Solana-format keypair JSON " +
        "(e.g. ~/.config/solana/id.json). Packet won't manage the key. it just reads it."
    )
    .option(
      "--compression-api <url>",
      "Optional Photon compression API endpoint (defaults to --rpc)"
    )
    .option(
      "--prover <url>",
      "Optional Photon prover endpoint (defaults to --rpc)"
    )
    .action(async (options) => {
      try {
        await SetUserConfig(options.privateKey, {
          rpc: options.rpc,
          keypairPath: options.keypair,
          compressionApiEndpoint: options.compressionApi,
          proverEndpoint: options.prover,
        });

        console.log(`Configuration written to ${ConfigPath}`);
        if (options.privateKey) {
          console.log(`Wallet stored at  ${WalletPath} (mode 0600)`);
        } else if (options.keypair) {
          console.log(`Using keypair at ${options.keypair}`);
        }
        console.log(`Config directory: ${ConfigFolderPath}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`${message}`);
        process.exitCode = 1;
      }
    });
};
