# Packet

![image](https://xpkt.dev/assets/banner.png)

Packet is an on-chain messaging and order protocol built on Solana. It combines end-to-end encryption, payment gating, compressed state via Light Protocol, and permanent off-chain storage via Irys, letting wallets, apps, and agents send verifiable, private messages without a centralized server.

See full documentation at [docs.xpkt.dev](https://docs.xpkt.dev).

## Monorepo Structure

```
packet/
|-- ts/          # TypeScript SDK (xpkt-sdk) and Docusaurus docs
|-- cli/         # CLI tool (xpkt-cli - packet binary)
`-- mcp/         # MCP server (xpkt-mcp - packet-mcp binary)
```

## Packages

| Package | Use it when |
|---|---|
| `xpkt-sdk` | You are building a TypeScript app, service, bot, or integration directly on Packet. |
| `xpkt-cli` | A human wants terminal commands for config, messages, inboxes, crypto, upload, and live event waits. |
| `xpkt-mcp` | An MCP agent host needs Packet tools, resources, upload, encryption, and live resource subscriptions. |

### [`ts/`](./ts): TypeScript SDK

**Package:** `xpkt-sdk`

The SDK for integrating Packet into TypeScript/JavaScript apps. Supports both browser (wallet-adapter) and Node.js (Keypair) environments.

```bash
npm install xpkt-sdk
```

See [ts/README.md](./ts/README.md) for full documentation.

### [`cli/`](./cli): CLI

**Package:** `xpkt-cli` | **Binary:** `packet`

A terminal interface for Packet. Send encrypted messages, manage inboxes, upload to Irys, listen for live events, and configure your wallet with no code required.

```bash
npm install -g xpkt-cli
```

See [cli/README.md](./cli/README.md) for full documentation.

### [`mcp/`](./mcp): MCP Server

**Package:** `xpkt-mcp` | **Binary:** `packet-mcp`

A stdio MCP server for Packet. Agent hosts can send encrypted messages, read inboxes and threads, upload content to Irys, decrypt Packet payloads, and use live resource subscriptions.

```bash
npx -y xpkt-mcp
```

For local development:

```bash
cd mcp
npm install
npm run build
node dist/index.js
```

See [mcp/README.md](./mcp/README.md) and [docs.xpkt.dev](https://docs.xpkt.dev) for full documentation.

## Core Concepts

### Inbox

An on-chain account owned by a wallet. Acts as a directory of incoming threads. Inboxes can enforce a payment rule: senders must include a minimum SOL payment to open a thread. Multiple inboxes per wallet are supported (inbox 0, 1, 2, ...).

### Thread

The conversation container between two wallets, created by the sender alongside the first message. Both parties can send messages by appending to the thread. Threads optionally hold an escrow balance.

### Message

A single entry in a thread. Carries a content type (`text`, `url`, `irys`, `ipfs`, or `arweave`) and a content field. Large or sensitive payloads are uploaded to Irys; the message stores the CID pointer.

Message bodies can also use Packet envelopes: a plain string, a typed `PacketContent`, or a `PacketMail` with a subject and one or more typed parts. Binary parts stay base64-encoded with a MIME content type so clients can render them as attachments.

### Encryption

Messages are encrypted with X25519 Diffie-Hellman before leaving the sender. A message can have multiple readers (sender + recipient). Wallets can use a deterministic wallet-derived key or register a separate Key account on-chain.

### Escrow

Inbox owners can enable escrow: incoming payments are held in a per-thread escrow account until the receiver approves and withdraws.

## Quick Example

**CLI:**

```bash
packet config init --rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY --keypair ~/.config/solana/id.json
packet message new-thread --to <pubkey> --text "Hello"
```

Message send commands default to encrypt + upload. Pass `--no-encrypt` or `--no-upload` only when plaintext or inline behavior is intentional.

**SDK:**

```ts
import { PacketClient, PacketWallet } from "xpkt-sdk";

const rpc = "https://devnet.helius-rpc.com/?api-key=YOUR_KEY";

const client = new PacketClient({
  wallet: PacketWallet.fromKeypair(keypair),
  connection: rpc,
  photonRpc: { compressionApiEndpoint: rpc, proverEndpoint: rpc },
  cluster: "devnet",
});

await client.createThread({
  to: recipientPublicKey,
  messageType: MessageType.Irys,
  content: irysUrl,
});
```

**MCP:**

```bash
PACKET_RPC_URL='https://devnet.helius-rpc.com/?api-key=YOUR_KEY' \
PACKET_KEYPAIR_PATH='/home/user/.config/xpkt/wallet.json' \
PACKET_CLUSTER='devnet' \
npx -y xpkt-mcp
```

MCP message send tools default to `encrypt: true` and `upload: true`. For hosts that support resource subscriptions, subscribe to `packet://activity`, `packet://thread/{thread}`, `packet://inbox/{inbox}`, or `packet://inbox/{owner}/{inbox}` and read the resource after update notifications.

---

## RPC Requirement

Packet requires a ZK Compression / Photon-compatible RPC. A standard-only Solana RPC endpoint is not enough because Packet reads and writes compressed accounts.

Use Helius RPC for the simplest setup:

```text
https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

See [RPC and Photon](https://docs.xpkt.dev/docs/concepts/rpc-photon) for details.

## Cost and Storage Notes

Packet is not gasless. Sending messages and creating threads are Solana transactions and can cost up to about `0.00005 SOL`; 1 USD of SOL is often enough for roughly 200 simple messages. Creating an inbox can cost around 1 USD because it opens on-chain account state, but a custom inbox is not required for basic communication.

Keep raw content out of the compressed message account. Use URLs/pointers for anything larger than about 128 bytes, otherwise transactions can fail from size/compute limits. Irys is the recommended storage path for durable encrypted message bodies; uploads under `100 KiB` are free on the current upload path, while larger uploads require funding. CLI and MCP use the configured wallet and attempt required Irys funding/payment automatically when upload needs it. Use about `2.50 USD / GB` only as a rough planning estimate and check current Irys pricing for exact costs.

You can use IPFS, Arweave, HTTPS, or a custom server instead of Irys. The receiver fetches the stored link, so if the server, gateway, resource, or pin disappears, the on-chain message can remain while the body becomes unreadable.

---

## Programs

`A3YNvikE96zn2PYrbqRa8hheH99ks7qt22zQiUF8Ttao` - Packet main program (inboxes, threads, messages, keys, users) (`mainnet` and `devnet`)

---

## Status

Packet is experimental and actively evolving. APIs may change while the agent/order protocol and SDK surface are being finalized.

---

## License

MIT
