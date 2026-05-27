import type { Command } from "commander";
import { isTextualMime, PacketEncryptionClient, packetContentBytes, parsePacketEnvelopeText } from "xpkt-sdk";
import { GetUserConfig } from "../config/get.js";
import { saveEnvelopeBinaryParts } from "../envelope/index.js";
import { readCryptoInput } from "./io.js";

export const registerDecryptCommand = (parent: Command) => {
  parent
    .command("decrypt")
    .description("Decrypt Packet encrypted content from text, file, or URL")
    .option("--text <content>", "Encrypted text / JSON body")
    .option("--file <path>", "File containing encrypted content")
    .option("--url <url>", "URL containing encrypted content")
    .option("--full-view <dir>", "Save binary Packet envelope parts to a target folder")
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

      const parsed = parsePacketEnvelopeText(plaintext);
      const savedFiles = await saveEnvelopeBinaryParts({
        dir: options.fullView,
        payload: parsed,
        fileStem: (index) => `packet-part-${index + 1}`,
      });

      if (options.json) {
        console.log(JSON.stringify({
          encrypted,
          plaintext,
          packet: {
            subject: parsed.subject,
            message: parsed.message,
            contentType: parsed.contentType,
            encoding: parsed.encoding,
            parts: parsed.parts?.map((part) => ({
              contentType: part.contentType,
              encoding: part.encoding,
              preview: isTextualMime(part.contentType) ? part.content : `[binary ${part.contentType}, ${packetContentBytes(part).byteLength} bytes]`,
            })),
          },
          savedFiles,
        }, null, 2));
      } else {
        if (parsed.subject) console.log(`subject: ${parsed.subject}`);
        console.log(parsed.message);
        for (const file of savedFiles) {
          console.log(`saved: ${file.path} (${file.contentType}, ${file.bytes} bytes)`);
        }
      }
    });
};
