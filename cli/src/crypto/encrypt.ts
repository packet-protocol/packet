import { PublicKey } from "@solana/web3.js";
import type { Command } from "commander";
import { AsymmetricEncryptionAlgorithm, PacketEncryptionClient } from "xpkt-sdk";
import fs from "fs";
import { GetUserConfig } from "../config/get.js";
import { buildCliPacketEnvelope, collectOption, stringList } from "../envelope/index.js";
import { requiredString } from "../input/index.js";
import { uploadToIrys } from "../upload/irys.js";

export const registerEncryptCommand = (parent: Command) => {
  parent
    .command("encrypt")
    .description("Encrypt content for a specific reader")
    .requiredOption("--to <pubkey>", "Target Solana wallet")
    .option("--content <message>", "Exact plaintext to encrypt. Cannot be combined with --text/--file")
    .option("--text <message>", "Add a text/plain Packet envelope part", collectOption, [])
    .option("--file <path>", "Add a file Packet envelope part", collectOption, [])
    .option("--subject <subject>", "Optional Packet envelope subject")
    .option("--dont-include-sender", "Exclude sender from readers", false)
    .option("--out <path>", "Output file path")
    .option("--upload", "Upload encrypted content to Irys", false)
    .action(async (options) => {
      const texts = stringList(options.text);
      const files = stringList(options.file);
      const hasContent = options.content != null;
      const hasEnvelopeParts = texts.length > 0 || files.length > 0;

      if (hasContent && hasEnvelopeParts) {
        throw new Error("Ambiguous input. Use --content for exact plaintext, or --text/--file for a Packet envelope");
      }
      if (!hasContent && !hasEnvelopeParts) {
        throw new Error("Missing input. Provide --content, --text, or --file");
      }

      const plaintext = hasContent
        ? requiredString(options.content, "--content")
        : (await buildCliPacketEnvelope({ texts, files, subject: options.subject })).plaintext;

      const { keypair, client, config } = GetUserConfig();
      client.useCrypto(new PacketEncryptionClient().useSolanaKeypair(keypair).requireIdentity());

      const targetPubkey = new PublicKey(options.to);
      const targetReader = new PacketEncryptionClient().reader({
        ownerWallet: options.to,
        keyAlg: AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519,
        publicKey: targetPubkey.toBytes(),
      });

      const body = await client.crypto.encrypt({
        plaintext,
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
};
