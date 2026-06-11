import type { Command } from "commander";
import {
  RoomClient,
  MessageType,
  utf8,
  buildPacketEnvelopePayload,
  encodeRoomBlobEnvelope,
} from "xpkt-sdk";
import { parseOptionalInteger, requiredString } from "../input/index.js";
import { uploadToIrys } from "../upload/irys.js";
import { printJson, shortKey, formatDateFromUnix } from "../message/format.js";
import { setupRoom, parseRoomRef, roomRefId } from "./common.js";

export const registerRoomMessageCommands = (parent: Command) => {
  // -- room send ----------------------------------------------------------
  // Mirrors the 1:1 thread send: the body is wrapped in the SAME PacketContent
  // envelope and uploaded to Irys; only the pointer goes on-chain. The
  // difference is the off-chain crypto layer — rooms encrypt the body ONCE under
  // the room epoch key (room blob envelope), where 1:1 encrypts per-reader.
  // Room bodies are ALWAYS epoch-encrypted, so there is no --no-encrypt.
  parent
    .command("send")
    .description("Send a message to a room (body uploaded to Irys like 1:1 sends, epoch-encrypted)")
    .argument("<roomId>", "32-byte room id (hex), printed by `room create`")
    .argument("<text>", "Message text")
    .option("--subject <subject>", "Optional subject for the Packet envelope payload")
    .option("--upload", "Upload the body to Irys and send the pointer (default)", true)
    .option("--no-upload", "Send the body inline on-chain (epoch-encrypted) instead of uploading to Irys")
    .option("--json", "Print JSON output", false)
    .action(async (roomArg, textArg, options) => {
      const { keypair, client, config } = setupRoom();

      const ref = parseRoomRef(roomArg);
      const room = await RoomClient.Load({ client, id: roomRefId(ref) });

      const text = requiredString(textArg, "<text>");
      const shouldUpload = options.upload !== false;

      // --no-upload: inline epoch-encrypted text on-chain (the old behaviour).
      // Only viable for short bodies (Solana tx size limit).
      if (!shouldUpload) {
        const res = await room.messages().send({ text });
        return reportSend(room, res, options.json, undefined);
      }

      // Same PacketContent envelope the thread/message send builds.
      const payload = buildPacketEnvelopePayload({
        content: text,
        subject: options.subject,
        contentType: "text/plain",
        encoding: "utf8",
      });

      // Resolve this sender's room epoch key (throws clearly if not a recipient).
      const epoch = await room.recoverEpochKey();
      if (epoch.status !== "ok") {
        throw new Error("cannot send: this wallet is not a recipient of the room's current epoch");
      }

      // Encrypt the body ONCE under the room epoch key, then upload via the
      // CLI's own Irys uploader (same call/options threads use).
      const blob = await encodeRoomBlobEnvelope({
        epochKey: epoch.key,
        roomId: room.roomId,
        epoch: epoch.epoch,
        plaintext: utf8(payload),
      });
      const uploaded = await uploadToIrys({
        keypair,
        config: config.config,
        payload: blob,
        contentType: "application/json",
        preferFree: true,
      });

      // The pointer becomes the (epoch-encrypted) on-chain content.
      const res = await room
        .messages()
        .send({ content: utf8(uploaded.url), messageType: MessageType.Irys });

      reportSend(room, res, options.json, uploaded);
    });

  // -- room read ----------------------------------------------------------
  parent
    .command("read")
    .description("Read + decrypt room messages, resolving Irys-stored bodies (bucket-paginated)")
    .argument("<roomId>", "32-byte room id (hex), printed by `room create`")
    .option("--limit <n>", "Max messages to return", "50")
    .option("--before-seq <s>", "Only messages with globalSeq < S")
    .option("--no-decrypt", "Do not decrypt message content")
    .option("--json", "Print JSON output", false)
    .action(async (roomArg, options) => {
      const { client } = setupRoom();

      const ref = parseRoomRef(roomArg);
      const room = await RoomClient.Load({ client, id: roomRefId(ref) });

      const decrypt = options.decrypt !== false;
      // parse implies includeContent: fetch + epoch-decrypt the Irys pointer so
      // we render the RESOLVED body, exactly like the 1:1 read path.
      const messages = await room.messages().loadMessages({
        limit: Number(options.limit ?? 50),
        beforeSeq: parseOptionalInteger(options.beforeSeq, "--before-seq"),
        decrypt,
        parse: decrypt,
      });

      const out = [];
      for (const msg of messages) {
        const data = msg.Message;
        const result = decrypt ? await msg.decrypt() : undefined;
        let text: string;
        if (!decrypt) {
          text = "[encrypted]";
        } else if (result?.status === "locked") {
          text = "[locked]";
        } else if (result?.status === "failed") {
          text = `[failed: ${result.error}]`;
        } else {
          // decrypted: render the resolved (Irys-fetched, epoch-decrypted) body.
          try {
            const parsed = await msg.loadParsedContent();
            text = parsed.message ?? result?.text ?? "[binary]";
          } catch (err) {
            text = `[content load failed: ${err instanceof Error ? err.message : String(err)}]`;
          }
        }
        out.push({
          seq: data.globalSeq.toString(),
          epoch: data.cryptoEpoch.toString(),
          sender: data.sender.toBase58(),
          slot: data.memberSlot,
          time: formatDateFromUnix(data.timestamp.toNumber()),
          status: result?.status ?? "encrypted",
          text,
        });
      }

      if (options.json) return printJson({ room: room.address.toBase58(), messages: out });

      console.log(`room ${room.address.toBase58()} messages=${out.length}`);
      for (const m of out) {
        console.log(
          `#${m.seq} [epoch ${m.epoch}] ${shortKey(m.sender)} (slot ${m.slot}) ${m.time}`
        );
        console.log(`  ${m.text}`);
      }
    });
};

type Uploaded = { id: string; url: string; bytes: number; usedFreeWallet: boolean };

const reportSend = (
  room: RoomClient,
  res: { message: any; address: any; receipt: string[] },
  json: boolean,
  uploaded: Uploaded | undefined
): void => {
  const seq = res.message ? res.message.globalSeq.toString() : "(pending indexer)";

  if (json) {
    printJson({
      room: room.address.toBase58(),
      seq: res.message ? res.message.globalSeq.toString() : null,
      address: res.address.toBase58(),
      signatures: res.receipt,
      uploaded: uploaded ? { id: uploaded.id, url: uploaded.url, bytes: uploaded.bytes } : null,
    });
    return;
  }

  console.log("[OK] message sent");
  console.log("room:", room.address.toBase58());
  console.log("seq:", seq);
  console.log("tx:", res.receipt.join(", "));
  if (uploaded) console.log("uploaded:", uploaded.url);
};
