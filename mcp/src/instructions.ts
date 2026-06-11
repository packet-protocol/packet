export const PACKET_MCP_DESCRIPTION = "MCP server for Packet: encrypted Solana-native messaging, inboxes, threads, rooms (group messaging), Irys upload, decryption, and live resource subscriptions.";

export const PACKET_MCP_INSTRUCTIONS = `
Packet is a Solana-native messaging protocol with end-to-end encryption, inboxes, threads, Irys-backed payloads, and optional payment/escrow flows.
Packet requires a ZK Compression / Photon-compatible RPC. Helius RPC is recommended. A standard-only Solana RPC will not work because Packet reads and writes compressed accounts.

Use message_activity first when you need current or historical conversations for the configured wallet.
Use message_inbox or message_inboxes when you need inbox-specific history.
Use message_messages or message_thread when you already know the thread id.
Use message_new_thread for the first message to a recipient.
Use message_new for replies in an existing thread.

Message send tools default to encrypt: true and upload: true. Keep those defaults unless the user explicitly asks for plaintext or inline content.
Use text and file fields to build Packet envelope content. Use content for a single body or existing pointer-like value. Use url for an existing URL pointer.
Packet actions can spend funds. Message sends and thread creation are Solana transactions and can cost up to about 0.00005 SOL. Creating an inbox opens on-chain account state and can cost around 1 USD, but custom inbox creation is not required for basic communication.
Irys uploads under 100 KiB are free on the current upload path; larger uploads require funding. The MCP server uses the configured wallet and attempts the required Irys funding/payment automatically when upload needs it, so the wallet must hold enough SOL. Treat 2.50 USD / GB as a rough planning estimate and check current Irys pricing for exact costs.
Avoid large inline message bodies. Use upload/pointers for anything larger than about 128 bytes, otherwise transactions can fail from size/compute limits.
The MCP server uses wallet-derived Ed25519-to-X25519 encryption/decryption and does not manage custom registered Key account private material.

Rooms are XPKT group conversations. Use packet_room_create to create a room (the wallet becomes admin), packet_room_add_member / packet_room_remove_member to manage membership, packet_room_list_members and packet_room_info to inspect, packet_room_send_message and packet_room_read_messages to communicate, packet_room_admin_recover to verify the admin can be reloaded from the wallet alone, and packet_room_recover to finish an unfinished epoch-header publication.
Because the MCP wallet is a raw keypair, members added via the MCP do not need to register an encryption key: their member secret is decryptable from the wallet key itself (SOLANA_ED25519_X25519). packet_room_add_member defaults to the member's registered key with a wallet-derived fallback; set skipKeyCheck only when the member is known to control a raw wallet keypair. Browser-wallet members cannot decrypt wallet-derived secrets and must register a packet key.
packet_room_send_message uploads the message body to Irys by default, exactly like the 1:1 message_new / message_new_thread tools, so the on-chain message stores a small Irys pointer instead of inline text — this avoids the Solana transaction size limit for long messages. The difference from 1:1 is the encryption layer: rather than encrypting per-reader, the body is encrypted once under the current room epoch key, so every active member of that epoch can read it. Set upload=false to send small messages inline. packet_room_read_messages resolves Irys-typed (and other pointer) messages automatically: it fetches the pointer and decrypts the room envelope, returning the resolved content rather than the raw URL.
packet_room_recover (admin only) finishes a pending header publication: a membership mutation can land without its covering header, or a staged external checkpoint can be opened but not activated, and membership cannot advance until it is resolved. It re-derives the admin secret from the wallet, calls resumePendingHeader (idempotent), and reports the finished header (epoch, kind, signatures) plus the publication status (needsHeader/publicationOpen/uncoveredMutation/pagesDone/pagesTotal); it returns "up to date" when nothing is pending.
Room messages are flagged locked when the wallet is not a recipient of that message's epoch (e.g. messages sent before being added). Removing a member rotates the room key forward.
Rooms require a BGW params artifact. Set PACKET_BGW_PARAMS_DIR to a directory holding a generated params manifest.json + chunks/*.bin; it is wired as the process-wide default at startup. The default params capacity is 1,048,576 member slots. Generating params for large capacities is expensive and should use the native params generator; the in-process BgwParamsGenerator is best for small/test capacities. Room tools fail with a clear error if no params artifact is configured.

Live event tools are live-only. They do not replay missed messages and should not be used to inspect previous messages.
For MCP hosts that support resource subscriptions, subscribe to packet://activity, packet://thread/{thread}, packet://inbox/{inbox}, or packet://inbox/{owner}/{inbox}. Resource subscriptions send update notifications; read the resource after an update to fetch current content.
`.trim();
