import type { Command } from "commander";
import { GetUserConfig } from "../config/get.js";
import { AsymmetricEncryptionAlgorithm, PacketEncryptionClient } from "xpkt-sdk";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import { uploadToIrys } from "../upload/irys.js";
import { requiredString } from "../message/parse.js";

/**
 * Read encrypted content from one of text, file, or URL.
 *
 * Validates that exactly one of the options is provided, and throws an error if not.
 */
async function readCryptoInput(options: { text?: string; file?: string; url?: string }): Promise<string> {
  const count = [options.text, options.file, options.url].filter(Boolean).length;
  if (count !== 1) throw new Error("Provide exactly one of --text, --file, or --url");
  if (options.text) return options.text;
  if (options.file) return fs.readFileSync(options.file, "utf-8");
  const res = await fetch(options.url!);
  if (!res.ok) throw new Error(`Failed to fetch ${options.url}: HTTP ${res.status}`);
  return await res.text();
}

/**
 * Registers the "crypto" command and its subcommands to the given commander Command instance.
 * 
 * Commands:
 *   - encrypt: Encrypt content for a specific reader, with options for input, output, and uploading.
 *   - decrypt: Decrypt Packet encrypted content from text, file, or URL, with an option to print JSON result.
 * 
 * Each command validates its input options and interacts with the PacketEncryptionClient to perform encryption or decryption.
 */
export const CommandCrypto = async (parent: Command) => {
  parent
    .command("encrypt")
    .description("Encrypt content for a specific reader")
    .requiredOption("--to <pubkey>", "Target Solana wallet")
    .option("--content <message>", "Message content to encrypt")
    .option("--file <path>", "Read from a file")
    .option("--dont-include-sender", "Exclude sender from readers", false)
    .option("--out <path>", "Output file path")
    .option("--upload", "Upload encrypted content to Irys", false)
    .action(async (options) => {

      const hasFile = options.file != null;
      const hasContent = options.content != null;

      if (hasFile && hasContent) {
        throw new Error("Ambiguous input. Use only one of: --content or --file");
      } else if (!hasFile && !hasContent) {
        throw new Error("Missing input. Provide one of: --content or --file");
      }

      var content: string;

      if (options.file != null) {
        const filePath = String(options.file ?? options.content);

        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const stat = fs.statSync(filePath);

        if (!stat.isFile()) {
          throw new Error(`Path is not a file: ${filePath}`);
        }

        content = fs.readFileSync(filePath, "utf-8");
      } else {
        content = requiredString(options.content, "--content");
      }

      const { keypair, client, config } = GetUserConfig();
      client.useCrypto(new PacketEncryptionClient().useSolanaKeypair(keypair).requireIdentity());

      const targetPubkey = new PublicKey(options.to);
      const targetReader = new PacketEncryptionClient().reader({
        ownerWallet: options.to,
        keyAlg: AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519,
        publicKey: targetPubkey.toBytes(),
      });

      const body = await client.crypto.encrypt({
        plaintext: content,
        readers: [targetReader],
        includeSelf: options.dontIncludeSender !== true,
      });

      const json = client.crypto.toJson(body);
      console.log("[OK] encrypted content");

      if (options.out) {
        fs.writeFileSync(options.out, json, "utf-8");
        console.log(`saved: ${options.out}`);
      }

      if (options.upload) {
        const uploaded = await uploadToIrys({ keypair, config, payload: json, contentType: "application/json", preferFree: true });
        console.log(`uploaded: ${uploaded.url}`);
      }

      if (!options.out && !options.upload) console.log(json);
    });

  parent
    .command("decrypt")
    .description("Decrypt Packet encrypted content from text, file, or URL")
    .option("--text <content>", "Encrypted text / JSON body")
    .option("--file <path>", "File containing encrypted content")
    .option("--url <url>", "URL containing encrypted content")
    .option("--json", "Print JSON result", false)
    .action(async (options) => {
      const { keypair, client } = GetUserConfig();
      client.useCrypto(new PacketEncryptionClient().useSolanaKeypair(keypair).requireIdentity());

      const raw = await readCryptoInput(options);
      let plaintext: string;
      let encrypted = true;

      try {
        const maybe = await client.crypto.maybeDecrypt(raw);
        plaintext = maybe.plaintext;
        encrypted = maybe.encrypted;
      } catch {
        const body = client.crypto.fromJson(raw);
        plaintext = await client.crypto.decrypt({ body });
      }

      if (options.json) {
        console.log(JSON.stringify({ encrypted, plaintext }, null, 2));
      } else {
        console.log(plaintext);
      }
    });
};
