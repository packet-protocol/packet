import type { Command } from "commander";
import { GetUserConfig } from "../config/get.js";
import { uploadToIrys } from "./irys.js";

export const registerUploadRawCommand = (parent: Command) => {
  parent
    .command("raw")
    .description("Upload raw content to Irys and get a CID")
    .requiredOption("--content <message>", "Message content to upload")
    .option("--content-type <type>", "Content type (e.g. text/plain, application/json)", "application/json")
    .action(async (options) => {
      const { keypair, config } = GetUserConfig();

      const uploaded = await uploadToIrys({
        keypair,
        config,
        payload: options.content,
        contentType: options.contentType,
        preferFree: true,
      });

      console.log("Uploaded:", uploaded);
    });
};
