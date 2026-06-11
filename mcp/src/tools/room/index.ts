import { z } from "zod";
import {
    RoomAdminClient,
    buildPacketEnvelopePayload,
    encodeRoomBlobEnvelope,
    getActiveMemberAccountsForRoom,
    MessageType,
    utf8,
} from "xpkt-sdk";
import type { PacketMcpConfig } from "../../config/types.js";
import { defineTool } from "../types.js";
import { jsonText, shortKey } from "../../message/format.js";
import { parseOptionalInteger, parsePublicKey } from "../../input/index.js";
import { uploadToIrys } from "../../upload/irys.js";
import { contentResult, textResult } from "../message/shared.js";
import { keypairSignMessage, useRoomCrypto } from "../../room/crypto.js";
import {
    parseOptionalHex32,
    parseRoomRef,
    parseRoomTarget,
} from "../../room/input.js";
import {
    memberObject,
    memberText,
    messageRow,
    messageRowText,
    roomInfoObject,
    roomInfoText,
} from "../../room/format.js";

export const ToolsRoom = (config: PacketMcpConfig) => [
    ToolRoomCreate(config),
    ToolRoomAddMember(config),
    ToolRoomRemoveMember(config),
    ToolRoomListMembers(config),
    ToolRoomSendMessage(config),
    ToolRoomReadMessages(config),
    ToolRoomInfo(config),
    ToolRoomAdminRecover(config),
    ToolRoomRecover(config),
];

const ToolRoomCreate = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "packet_room_create",
        config: {
            title: "Create room",
            description: "Create a new XPKT room (group). The configured wallet becomes the room admin. The admin seed is derived deterministically from the wallet, so the room can be recovered later with packet_room_admin_recover.",
            inputSchema: {
                roomId: z.string().optional().describe("Optional 32-byte hex room id. Random if omitted."),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useRoomCrypto(client, keypair);
            const roomId = parseOptionalHex32(options.roomId, "roomId");
            const { client: admin } = await RoomAdminClient.Create({
                client,
                params: { roomId, signMessage: keypairSignMessage(keypair) },
            });
            await admin.refresh();
            const info = roomInfoObject(admin.Room);
            if (options.json) return textResult(jsonText(info));
            return textResult(`created room\n${roomInfoText(admin.Room)}`);
        },
    });
};

const ToolRoomAddMember = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "packet_room_add_member",
        config: {
            title: "Add room member",
            description: "Add (or re-activate) a member of a room and publish the covering epoch header. Defaults to the member's registered key with wallet-derived fallback; set skipKeyCheck to always use the wallet-derived key (only for members controlling a raw wallet keypair, e.g. SDK/CLI/MCP).",
            inputSchema: {
                room: z.string().describe("32-byte hex room id (printed by packet_room_create)"),
                memberPubkey: z.string().describe("Member wallet public key to add"),
                skipKeyCheck: z.boolean().optional().describe("Skip registered-key lookup and always encrypt to the member's wallet-derived ed25519->x25519 key"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useRoomCrypto(client, keypair);
            const admin = await client.roomAdmin({
                ...parseRoomTarget(options.room),
                signMessage: keypairSignMessage(keypair),
            });
            const member = parsePublicKey(options.memberPubkey, "memberPubkey");
            const result = await admin.addMember({ member, skipKeyCheck: options.skipKeyCheck === true });
            const out = {
                member: result.member.toBase58(),
                slot: result.slot,
                memberKey: result.memberKey,
                epoch: result.header.epoch.toString(),
                headerKind: result.header.kind,
                signatures: result.signatures,
            };
            if (options.json) return textResult(jsonText(out));
            const warn = result.memberKey === "wallet-derived"
                ? "\nnote: encrypted to wallet-derived key; a browser-wallet member would need to register a packet key to decrypt."
                : "";
            return textResult(`added ${shortKey(out.member)} at slot ${out.slot} (key=${out.memberKey}, epoch ${out.epoch})${warn}`);
        },
    });
};

const ToolRoomRemoveMember = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "packet_room_remove_member",
        config: {
            title: "Remove room member",
            description: "Remove a member from a room and publish the covering epoch header (rotates the room key forward so removed members cannot read new messages).",
            inputSchema: {
                room: z.string().describe("32-byte hex room id (printed by packet_room_create)"),
                memberPubkey: z.string().describe("Member wallet public key to remove"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useRoomCrypto(client, keypair);
            const admin = await client.roomAdmin({
                ...parseRoomTarget(options.room),
                signMessage: keypairSignMessage(keypair),
            });
            const member = parsePublicKey(options.memberPubkey, "memberPubkey");
            const result = await admin.removeMember({ member });
            const out = {
                member: result.member.toBase58(),
                slot: result.slot,
                epoch: result.header.epoch.toString(),
                headerKind: result.header.kind,
                signatures: result.signatures,
            };
            if (options.json) return textResult(jsonText(out));
            return textResult(`removed ${shortKey(out.member)} from slot ${out.slot} (epoch ${out.epoch})`);
        },
    });
};

const ToolRoomListMembers = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "packet_room_list_members",
        config: {
            title: "List room members",
            description: "List the active members of a room with their slots.",
            inputSchema: {
                room: z.string().describe("32-byte hex room id (printed by packet_room_create)"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useRoomCrypto(client, keypair);
            const room = await client.room({ id: parseRoomRef(options.room) });
            const accounts = await getActiveMemberAccountsForRoom({ client, room: room.address });
            const rows = accounts
                .map(memberObject)
                .sort((a, b) => a.slot - b.slot);
            if (options.json) return textResult(jsonText({ room: room.address.toBase58(), members: rows }));
            if (rows.length === 0) return textResult("no active members");
            return textResult(rows.map(memberText).join("\n"));
        },
    });
};

const ToolRoomSendMessage = ({ keypair, client, config }: PacketMcpConfig) => {
    return defineTool({
        name: "packet_room_send_message",
        config: {
            title: "Send room message",
            description: "Send a message to a room. The configured wallet must be an active member. Like the 1:1 send tools, the body is uploaded to Irys by default (the on-chain message stores an Irys pointer), which avoids the Solana transaction size limit for long messages; set upload=false to send the text inline instead. The body is always encrypted once under the current room epoch key (every active member of that epoch can read it).",
            inputSchema: {
                room: z.string().describe("32-byte hex room id (printed by packet_room_create)"),
                text: z.string().describe("Message text"),
                subject: z.string().optional().describe("Optional subject for the PacketContent envelope"),
                raw: z.boolean().optional().describe("Upload/send the exact text instead of wrapping it in a PacketContent envelope"),
                upload: z.boolean().optional().describe("Upload the (epoch-encrypted) body to Irys and store the resulting pointer on-chain. Defaults to true; set false to send inline (small messages only)"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useRoomCrypto(client, keypair);
            const room = await client.room({ id: parseRoomRef(options.room) });
            const text = String(options.text ?? "");
            const shouldUpload = options.upload !== false;

            if (!shouldUpload) {
                const result = await room.messages().send({ text });
                const out = {
                    address: result.address.toBase58(),
                    seq: result.message ? result.message.globalSeq.toString() : null,
                    uploaded: null as null | { url: string; bytes: number },
                    signatures: result.receipt,
                };
                if (options.json) return textResult(jsonText(out));
                return textResult(`sent message ${shortKey(out.address)}${out.seq ? ` seq=${out.seq}` : ""} (inline)`);
            }

            // Resolve the sender's room epoch key (errors clearly if not a recipient).
            const epoch = await room.recoverEpochKey();
            if (epoch.status !== "ok") {
                throw new Error(
                    `cannot send: this wallet is not a recipient of the current room epoch ${epoch.epoch.toString()}`,
                );
            }

            // Build the SAME content payload the 1:1 thread/message send tool builds
            // (PacketContent envelope + content-type + encoding). Content is content;
            // the only room-specific difference is the encryption layer below.
            const plaintext = buildPacketEnvelopePayload({
                content: text,
                subject: options.subject,
                raw: options.raw,
                contentType: "text/plain",
                encoding: "utf8",
            });

            // Rooms encrypt the body ONCE under the room epoch key (vs the 1:1 tool's
            // per-reader client.crypto.encrypt) via the SDK room blob envelope.
            const blob = await encodeRoomBlobEnvelope({
                epochKey: epoch.key,
                roomId: room.roomId,
                epoch: epoch.epoch,
                plaintext: utf8(plaintext),
            });

            // Upload the encrypted blob via the MCP's existing Irys uploader, same as
            // the 1:1 tool (application/json, free wallet preferred).
            const uploaded = await uploadToIrys({
                keypair,
                config,
                payload: blob,
                contentType: "application/json",
                preferFree: true,
            });

            // The on-chain message stores the Irys URL as an Irys-typed pointer.
            const result = await room.messages().send({
                content: utf8(uploaded.url),
                messageType: MessageType.Irys,
            });
            const out = {
                address: result.address.toBase58(),
                seq: result.message ? result.message.globalSeq.toString() : null,
                uploaded: { url: uploaded.url, bytes: uploaded.bytes },
                signatures: result.receipt,
            };
            if (options.json) return textResult(jsonText(out));
            return textResult(
                `sent message ${shortKey(out.address)}${out.seq ? ` seq=${out.seq}` : ""}\nuploaded: ${uploaded.url}`,
            );
        },
    });
};

const ToolRoomReadMessages = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "packet_room_read_messages",
        config: {
            title: "Read room messages",
            description: "Read and decrypt room messages (newest first). Messages whose epoch the wallet cannot read are flagged locked.",
            inputSchema: {
                room: z.string().describe("32-byte hex room id (printed by packet_room_create)"),
                limit: z.number().optional().describe("Max messages to return (default 50)"),
                beforeSeq: z.number().optional().describe("Only messages with global seq < beforeSeq"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useRoomCrypto(client, keypair);
            const room = await client.room({ id: parseRoomRef(options.room) });
            // includeContent (implied by parse) resolves Irys/Url/Ipfs/Arweave
            // pointers: it fetches the pointer and decodes the room blob envelope,
            // so we return the RESOLVED content, not the raw URL. Locked messages
            // (not a recipient of the epoch) keep their flag.
            const handles = await room.loadMessages({
                limit: Number(options.limit ?? 50),
                beforeSeq: parseOptionalInteger(options.beforeSeq, "beforeSeq"),
                decrypt: true,
                parse: true,
            });
            const rows = await Promise.all(handles.map(async (handle) => {
                const decrypted = await handle.decrypt();
                // For Irys-typed messages decrypt() only yields the pointer; the
                // parsed content (primed by parse:true) holds the fetched body.
                const resolved = decrypted.status === "decrypted"
                    ? (handle.Parsed?.message ?? decrypted.text)
                    : undefined;
                return messageRow(handle.Message, decrypted, resolved);
            }));
            if (options.json) return textResult(jsonText(rows));
            if (rows.length === 0) return textResult("no messages");
            return textResult(rows.map(messageRowText).join("\n\n"));
        },
    });
};

const ToolRoomInfo = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "packet_room_info",
        config: {
            title: "Room info",
            description: "Show room state: address, room id, admin, epoch, member count, params id.",
            inputSchema: {
                room: z.string().describe("32-byte hex room id (printed by packet_room_create)"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useRoomCrypto(client, keypair);
            const room = await client.room({ id: parseRoomRef(options.room) });
            if (options.json) return textResult(jsonText(roomInfoObject(room.Room)));
            return textResult(roomInfoText(room.Room));
        },
    });
};

const ToolRoomAdminRecover = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "packet_room_admin_recover",
        config: {
            title: "Recover room admin",
            description: "Zero-state admin reload: re-derive the admin secret from the wallet and reconstruct the recipient state from the on-chain header chain, verifying it matches the room mirror. Use to confirm admin recovery works (the configured wallet must be the room admin).",
            inputSchema: {
                room: z.string().describe("32-byte hex room id (printed by packet_room_create)"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useRoomCrypto(client, keypair);
            const admin = await RoomAdminClient.Load({
                client,
                ...parseRoomTarget(options.room),
                signMessage: keypairSignMessage(keypair),
            });
            await admin.refresh();
            const out = {
                ok: true,
                ...roomInfoObject(admin.Room),
                recipientStateVerified: true,
            };
            if (options.json) return textResult(jsonText(out));
            return contentResult(`admin recovery OK — recipient state reconstructed and verified\n${roomInfoText(admin.Room)}`, []);
        },
    });
};

const ToolRoomRecover = ({ keypair, client }: PacketMcpConfig) => {
    return defineTool({
        name: "packet_room_recover",
        config: {
            title: "Resume pending room header",
            description: "Finish an unfinished epoch-header publication for a room (idempotent). A membership mutation can land without its covering header, or a staged external checkpoint can be opened but not activated; membership cannot advance until that is resolved. Re-derives the admin secret from the wallet (the configured wallet must be the room admin) and resumes the pending publication.",
            inputSchema: {
                room: z.string().describe("32-byte hex room id (printed by packet_room_create)"),
                json: z.boolean().optional().describe("Print JSON output"),
            },
        },
        cb: async (options) => {
            useRoomCrypto(client, keypair);
            const admin = await RoomAdminClient.Load({
                client,
                ...parseRoomTarget(options.room),
                signMessage: keypairSignMessage(keypair),
            });
            const result = await admin.resumePendingHeader();
            const pending = await admin.pendingPublication();
            const status = {
                needsHeader: pending.needsHeader,
                publicationOpen: pending.publicationOpen,
                uncoveredMutation: pending.uncoveredMutation,
                pagesDone: pending.pagesDone,
                pagesTotal: pending.pagesTotal,
            };

            if (result === null) {
                const out = { resumed: false, header: null, status };
                if (options.json) return textResult(jsonText(out));
                return textResult("no pending header publication; room is up to date");
            }

            const header = {
                epoch: result.epoch.toString(),
                kind: result.kind,
                chainBreak: result.chainBreak,
                memberVersion: result.memberVersion.toString(),
                signatures: result.signatures,
            };
            const out = { resumed: true, header, status };
            if (options.json) return textResult(jsonText(out));
            return textResult(
                `resumed pending header publication\nepoch=${header.epoch} kind=${header.kind} memberVersion=${header.memberVersion}\nsignatures: ${header.signatures.join(", ")}`,
            );
        },
    });
};
