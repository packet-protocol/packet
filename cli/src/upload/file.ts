import fs from "fs";
import type { Command } from "commander";
import { GetUserConfig } from "../config/get.js";
import { detectMime } from "../files/index.js";
import { uploadToIrys } from "./irys.js";

export const registerUploadFileCommand = (parent: Command) => {
  parent
    .command("file")
    .description("Upload a file to Irys and get a CID")
    .argument("<path>", "Path to file to upload")
    .option("--content-type <type>", "Content type (e.g. text/plain, application/json)")
    .action(async (path, options) => {
      const { keypair, config } = GetUserConfig();

      const buf = fs.readFileSync(path);
      const contentType = await detectMime(path, options.contentType);
      const uploaded = await uploadToIrys({
        keypair,
        config,
        payload: buf,
        contentType,
        preferFree: true,
      });

      console.log("Uploaded:", uploaded);
    });
};
