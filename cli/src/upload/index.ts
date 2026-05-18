import { Command } from "commander"
import { GetUserConfig } from "../config/get.js";
import { uploadToIrys } from "./irys.js";
import fs from "fs";
import { detectMime } from "../helpers/file.js";


export const CommandUpload = async (parent: Command) => {
    parent
        .command("raw")
        .description("Upload raw content to Irys and get a CID")
        .requiredOption("--content <message>", "Message content to upload")
        .option("--content-type <type>", "Content type (e.g. text/plain, application/json)", "application/json")
        .action(async (options) => {
            // load config
            const { keypair, config } = GetUserConfig();

            const uploaded = await uploadToIrys({ keypair, config, payload: options.content, contentType: options.contentType, preferFree: true });

            console.log("Uploaded:", uploaded);
        });

    parent
        .command("file")
        .description("Upload a file to Irys and get a CID")
        .argument("<path>", "Path to file to upload")
        .option("--content-type <type>", "Content type (e.g. text/plain, application/json)")
        .action(async (path, options) => {
            // load config
            const { keypair, config } = GetUserConfig();

            const buf = fs.readFileSync(path);
            const contentType = await detectMime(path, options.contentType);
            const uploaded = await uploadToIrys({ keypair, config, payload: buf, contentType, preferFree: true });

            console.log("Uploaded:", uploaded);
        });
}