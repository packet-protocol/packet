export const PACKET_MCP_DESCRIPTION = "MCP server for Packet: encrypted Solana-native messaging, inboxes, threads, Irys upload, decryption, and live resource subscriptions.";

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

Live event tools are live-only. They do not replay missed messages and should not be used to inspect previous messages.
For MCP hosts that support resource subscriptions, subscribe to packet://activity, packet://thread/{thread}, packet://inbox/{inbox}, or packet://inbox/{owner}/{inbox}. Resource subscriptions send update notifications; read the resource after an update to fetch current content.
`.trim();
