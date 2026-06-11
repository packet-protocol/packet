# Packet MCP (xpkt-mcp)

MCP server for Packet: encrypted Solana-native messaging — direct threads and rooms (encrypted group messaging) — plus inboxes, Irys upload, decryption, and live resource subscriptions.

Use Packet MCP when an agent host needs Packet access. Use `xpkt-cli` when a human wants terminal commands. Use `xpkt-sdk` when you are building directly in TypeScript.

See full documentation at [docs.xpkt.dev](https://docs.xpkt.dev).

## Installation

Run the server through npm:

```bash
npx -y xpkt-mcp
```

Or install it globally:

```bash
npm install -g xpkt-mcp
packet-mcp
```

For local development from this repository:

```bash
cd mcp
npm install
npm run build
node dist/index.js
```

The server is a stdio MCP process. It does not open an HTTP port.

## Required Environment

| Variable | Required | Description |
|---|---|---|
| `PACKET_RPC_URL` | Yes | ZK Compression / Photon-compatible Solana RPC URL. Helius RPC is recommended. |
| `PACKET_CLUSTER` | Yes | `mainnet` or `devnet`. |
| `PACKET_KEYPAIR_PATH` | One of keypair/private key | Path to a Solana JSON keypair file. |
| `PACKET_PRIVATE_KEY` | One of keypair/private key | Base58-encoded Solana secret key. |
| `PACKET_COMPRESSION_API_ENDPOINT` | No | Photon compression API endpoint. Defaults to `PACKET_RPC_URL`. |
| `PACKET_PROVER_ENDPOINT` | No | Photon prover endpoint. Defaults to `PACKET_RPC_URL`. |
| `PACKET_BGW_PARAMS_DIR` | No (required for room tools) | Local directory with a generated BGW params artifact (`manifest.json` + `chunks/*.bin`). Wired as the process-wide default at startup. Required by the `packet_room_*` tools. |

Set exactly one of `PACKET_KEYPAIR_PATH` or `PACKET_PRIVATE_KEY`.

`PACKET_RPC_URL` must support ZK Compression / Photon. A standard-only Solana RPC will not work because Packet reads and writes compressed accounts. Recommended endpoints:

```text
https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

## Server Instructions

The server advertises instructions to MCP hosts:

- Use `message_activity` first when you need current or historical conversations for the configured wallet.
- Use `message_inbox` or `message_inboxes` when you need inbox-specific history.
- Use `message_messages` or `message_thread` when you already know the thread id.
- Use `message_new_thread` for the first message to a recipient.
- Use `message_new` for replies in an existing thread.
- Use `packet_room_*` tools for XPKT rooms (group messaging): `packet_room_create`, `packet_room_add_member`, `packet_room_remove_member`, `packet_room_list_members`, `packet_room_send_message`, `packet_room_read_messages`, `packet_room_info`, `packet_room_admin_recover`, `packet_room_recover`.
- Message send tools default to `encrypt: true` and `upload: true`. Keep those defaults unless the user explicitly asks for plaintext or inline content.
- Packet actions can spend funds. Message sends are Solana transactions; Irys uploads above `100 KiB` require funding; inbox creation opens on-chain account state.
- Live event tools are live-only. They do not replay missed messages and should not be used to inspect previous messages.
- For MCP hosts that support resource subscriptions, subscribe to `packet://activity`, `packet://thread/{thread}`, `packet://inbox/{inbox}`, or `packet://inbox/{owner}/{inbox}`. Resource subscriptions send update notifications; read the resource after an update to fetch current content.

## Cost and Storage Notes

Packet is not gasless. Message sends and thread creation are Solana transactions and can cost up to about `0.00005 SOL`; 1 USD of SOL covers roughly 200 simple messages. Creating an inbox can cost around 1 USD because it opens on-chain account state, but a custom inbox is not required for basic communication.

Keep raw content out of the message account. Use URL pointers for anything larger than about 128 bytes; large inline bodies can fail from transaction size limits. Irys uploads under `100 KiB` are free on the current upload path; larger uploads require funding. The MCP server uses the configured wallet and attempts the required Irys funding/payment automatically. Use about `2.50 USD / GB` as a rough planning estimate and check current Irys pricing for exact costs.

Irys is recommended because sent message bodies should remain durable. You can use IPFS, Arweave, HTTPS, or a custom server, but the receiver must be able to fetch the stored link later. If that resource disappears, the on-chain message can remain while the body becomes unreadable.

The MCP server currently uses wallet-derived Ed25519-to-X25519 encryption/decryption. It does not manage custom registered Key account private material.

## Claude Code

```bash
claude mcp add packet --transport stdio \
  -e PACKET_RPC_URL='https://devnet.helius-rpc.com/?api-key=YOUR_KEY' \
     PACKET_KEYPAIR_PATH='/home/user/.config/xpkt/wallet.json' \
     PACKET_CLUSTER='devnet' \
  -- npx -y xpkt-mcp
```

For local development:

```bash
claude mcp add packet --transport stdio \
  -e PACKET_RPC_URL='https://devnet.helius-rpc.com/?api-key=YOUR_KEY' \
     PACKET_KEYPAIR_PATH='/home/user/.config/xpkt/wallet.json' \
     PACKET_CLUSTER='devnet' \
  -- node /path/to/packet/mcp/dist/index.js
```

Claude's `-e` flag accepts multiple `KEY=value` values after one `-e`; keep the `--` before the command.

## Codex

Add a stdio MCP server entry to your Codex config:

```toml
[mcp_servers.packet]
command = "npx"
args = ["-y", "xpkt-mcp"]
enabled = true

[mcp_servers.packet.env]
PACKET_RPC_URL = "https://devnet.helius-rpc.com/?api-key=YOUR_KEY"
PACKET_KEYPAIR_PATH = "/home/user/.config/xpkt/wallet.json"
PACKET_CLUSTER = "devnet"
```

For local development:

```toml
[mcp_servers.packet]
command = "node"
args = ["/path/to/packet/mcp/dist/index.js"]
enabled = true

[mcp_servers.packet.env]
PACKET_RPC_URL = "https://devnet.helius-rpc.com/?api-key=YOUR_KEY"
PACKET_KEYPAIR_PATH = "/home/user/.config/xpkt/wallet.json"
PACKET_CLUSTER = "devnet"
```

Restart or reload Codex after changing MCP config.

## Hermes

Hermes should be configured as a stdio MCP client. Use the same command/env shape:

```yaml
mcp_servers:
  packet:
    command: npx
    args:
      - -y
      - xpkt-mcp
    env:
      PACKET_RPC_URL: https://devnet.helius-rpc.com/?api-key=YOUR_KEY
      PACKET_KEYPAIR_PATH: /home/user/.config/xpkt/wallet.json
      PACKET_CLUSTER: devnet
```

If Hermes uses a different key name for MCP servers, keep the same process details: command `npx`, args `["-y", "xpkt-mcp"]`, and the Packet environment variables above.

## OpenClaw and Other MCP Clients

Any MCP host that supports stdio servers can run Packet MCP with this process definition:

```json
{
  "name": "packet",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "xpkt-mcp"],
  "env": {
    "PACKET_RPC_URL": "https://devnet.helius-rpc.com/?api-key=YOUR_KEY",
    "PACKET_KEYPAIR_PATH": "/home/user/.config/xpkt/wallet.json",
    "PACKET_CLUSTER": "devnet"
  }
}
```

If the host supports only local binaries, install globally and use:

```json
{
  "command": "packet-mcp",
  "args": []
}
```

## Tool Groups

| Group | Tools |
|---|---|
| Messages | `message_new_thread`, `message_new`, `message_activity`, `message_messages`, `message_last`, `message_inbox`, `message_inboxes`, `message_thread` |
| Live events | `message_events`, `message_events_inbox`, `message_watch` |
| Inbox management | `message_create_inbox`, `message_edit_inbox_payment` |
| Escrow | `message_escrow_approve`, `message_escrow_withdraw` |
| Rooms | `packet_room_create`, `packet_room_add_member`, `packet_room_remove_member`, `packet_room_list_members`, `packet_room_send_message`, `packet_room_read_messages`, `packet_room_info`, `packet_room_admin_recover`, `packet_room_recover` |
| Crypto | `crypto_encrypt`, `crypto_decrypt` |
| Upload | `upload_raw`, `upload_file` |

Message send tools default to **encrypt + upload**. Agents can set `encrypt: false` or `upload: false` when they intentionally want plaintext or inline behavior.

Live event tools are not history readers. Use `message_activity`, `message_inbox`, or `message_messages` for past messages.

## Rooms (group messaging)

Rooms are the flagship Packet capability: Solana-native group conversations with end-to-end encryption and forward-secure per-epoch keys. An agent can spin up a room, manage membership, and exchange encrypted group messages entirely through the `packet_room_*` tools.

A typical flow:

```text
packet_room_create                       -> room PDA + roomId (wallet becomes admin)
packet_room_add_member    room=<id> memberPubkey=<pubkey>
packet_room_send_message  room=<id> text="hello group"
packet_room_read_messages room=<id>      -> newest-first, decrypted
packet_room_list_members  room=<id>
packet_room_remove_member room=<id> memberPubkey=<pubkey>   (rotates the room key forward)
packet_room_admin_recover room=<id>      -> reload + verify admin state from the wallet alone
packet_room_recover       room=<id>      -> finish a pending epoch-header publication (admin only)
```

- A room reference is either the room PDA (base58 address) or a 32-byte hex `roomId`.
- `packet_room_create` makes the configured wallet the room admin. The admin seed is derived deterministically from the wallet keypair, so `packet_room_admin_recover` can reload and verify admin state with no stored secret. Pass an optional 32-byte hex `roomId`, or let one be generated.
- `packet_room_add_member` defaults to the member's registered key with a wallet-derived fallback. Set `skipKeyCheck: true` to always encrypt the member secret to the member's wallet-derived Ed25519→X25519 key — only appropriate for members that control a raw wallet keypair (SDK/CLI/MCP). Browser-wallet members cannot decrypt wallet-derived secrets and must register a packet key.
- Because the MCP wallet is a raw keypair, members added via the MCP do not need to register an encryption key: their member secret is decryptable from the wallet key itself.
- `packet_room_send_message` uploads the message body to Irys by default, exactly like the 1:1 `message_new` / `message_new_thread` tools (the on-chain message stores a small Irys pointer instead of inline text, avoiding the Solana transaction-size limit for long messages). The encryption layer is the only difference from 1:1: instead of encrypting per-reader, the body is encrypted once under the current room epoch key, so every active member of that epoch can read it. It accepts `subject` and `raw` like the 1:1 tools; set `upload: false` to send small messages inline.
- `packet_room_read_messages` decrypts newest-first and flags messages the wallet cannot read (e.g. sent before being added) as `locked`. It resolves Irys-typed (and other pointer) messages automatically — fetching the pointer and decrypting the room envelope — so it returns the resolved content, not the raw URL. Removing a member rotates the room key forward.
- `packet_room_recover` (admin only) finishes an unfinished epoch-header publication. A membership mutation can land without its covering header, or a staged external checkpoint can be opened but not activated, and membership cannot advance until that is resolved. It re-derives the admin secret from the wallet, calls the SDK's idempotent `resumePendingHeader`, and reports the finished header (`epoch`, `kind`, `signatures`) plus the publication status (`needsHeader`/`publicationOpen`/`uncoveredMutation`/`pagesDone`/`pagesTotal`); it returns "up to date" when nothing is pending.

### BGW params

Rooms require a global BGW params artifact. Set `PACKET_BGW_PARAMS_DIR` to a directory containing a generated `manifest.json` and `chunks/*.bin`; it is configured as the process-wide default at startup (`configureDefaultBgwParams`) and resolved lazily on first room use. Room tools fail with a clear error if no artifact is configured.

The default params capacity is `1,048,576` member slots. Generating params for large capacities is expensive: use the native params generator to produce the artifact once per capacity. The in-process `BgwParamsGenerator` from `xpkt-sdk` is convenient for small/test capacities. Rooms store only a `paramsId` + `paramsRoot`; the same artifact must be available wherever the room is read or administered.

## Resources

Packet MCP exposes readable resources for hosts that support MCP resources:

| URI | Description |
|---|---|
| `packet://activity` | Current wallet activity and latest thread messages. |
| `packet://thread/{thread}` | Messages in one thread. |
| `packet://inbox/{inbox}` | Threads in one inbox owned by the configured wallet. |
| `packet://inbox/{owner}/{inbox}` | Threads in one inbox owned by another wallet. |

For MCP hosts that support resource subscriptions, subscribe to those URIs. Resource subscriptions send update notifications; read the resource after an update to fetch current content.

## License

Apache-2.0
