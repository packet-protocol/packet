import { program } from "commander";
import { CommandInit } from "./config/init.js";
import { CommandCrypto } from "./crypto/index.js";
import { CommandUpload } from "./upload/index.js";
import { CommandMessage } from "./message/index.js";

(() => {
    program
        .name("Packet CLI")
        .version(process.env._PACKET_CLI_VERSION || "0.0.0") 
        .description("A CLI for Packet Protocol (xpkt)")


    const init = program.command("init").description("Initialization commands")
    const crypto = program.command("crypto").description("Cryptography commands")
    const upload = program.command("upload").description("Upload commands")
    const message = program.command("message").description("Message commands")

    CommandInit(init);
    CommandCrypto(crypto);
    CommandUpload(upload);
    CommandMessage(message);

    program.parse();
})();