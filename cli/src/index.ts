import { program } from "commander";
import { CommandConfig } from "./config/index.js";
import { CommandCrypto } from "./crypto/index.js";
import { CommandUpload } from "./upload/index.js";
import { CommandMessage } from "./message/index.js";
import { CommandRoom } from "./room/index.js";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

(() => {
    program
        .name("Packet CLI")
        .version(process.env._PACKET_CLI_VERSION || "0.0.0") 
        .description("A CLI for Packet Protocol (xpkt)")


    const config = program.command("config").description("Configuration commands")
    const crypto = program.command("crypto").description("Cryptography commands")
    const upload = program.command("upload").description("Upload commands")
    const message = program.command("message").description("Message commands")
    const room = program.command("room").description("Room / group-messaging commands (XPKT)")

    CommandConfig(config);
    CommandCrypto(crypto);
    CommandUpload(upload);
    CommandMessage(message);
    CommandRoom(room);

    program.parse();
})();