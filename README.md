# Packet

![image](https://xpkt.dev/assets/banner.png)

Packet is an on-chain messaging and order protocol built on Solana. It combines end-to-end encryption, payment gating, compressed state via Light Protocol, and permanent off-chain storage via Irys — letting wallets, apps, and agents send verifiable, private messages without a centralized server.

Packet supports **1:1 messaging** and **end-to-end encrypted group chat**. Group chat uses BGW broadcast encryption over BLS12-381: a single epoch key is distributed to every member through a compact on-chain header instead of re-encrypting each message per recipient, and members recover access from nothing but their Solana wallet — no key server, no local state, no per-recipient message copies.

See full documentation at [docs.xpkt.dev](https://docs.xpkt.dev).

## Monorepo structure

```
packet/
|-- sdk/    # TypeScript SDK (xpkt-sdk)
|-- cli/    # CLI tool (xpkt-cli - packet binary)
|-- mcp/    # MCP server (xpkt-mcp - packet-mcp binary)
`-- wasm/   # BLS12-381 BGW broadcast-encryption engine (WebAssembly)
```

## Packages

| Package | Use it when |
|---|---|
| `xpkt-sdk` ([`sdk/`](./sdk)) | You are building a TypeScript app, service, bot, or integration directly on Packet. |
| `xpkt-cli` ([`cli/`](./cli)) | A human wants terminal commands for config, messages, rooms, inboxes, crypto, and upload. |
| `xpkt-mcp` ([`mcp/`](./mcp)) | An MCP agent host needs Packet tools, resources, upload, and encryption. |
| WASM engine ([`wasm/`](./wasm)) | You need the BGW broadcast-encryption primitive that powers group chat. |

### [`sdk/`](./sdk): TypeScript SDK

**Package:** `xpkt-sdk` — works in the browser (wallet adapter) and Node.js (Keypair).

```bash
npm install xpkt-sdk
```

### [`cli/`](./cli): CLI

**Package:** `xpkt-cli` | **Binary:** `packet`

```bash
npm install -g xpkt-cli
```

### [`mcp/`](./mcp): MCP server

**Package:** `xpkt-mcp` | **Binary:** `packet-mcp`

```bash
npx -y xpkt-mcp
```

## Core concepts

### Inbox

An on-chain account owned by a wallet that acts as a directory of incoming threads. Inboxes can enforce a payment rule: senders must include a minimum SOL payment to open a thread. Multiple inboxes per wallet are supported.

### Thread

The conversation container between two wallets, created by the sender alongside the first message. Both parties append messages. Threads optionally hold an escrow balance.

### Room

The container for encrypted **group chat**. An admin creates a room and adds or removes members; each member is assigned a slot. Messages are encrypted once under a per-epoch key that BGW broadcast encryption distributes to all current members through a compact, immutable on-chain header. Membership changes rotate the epoch and are recorded as a checkpoint/delta chain in the headers, so a member reconstructs the recipient set and recovers keys from chain state alone. New members cannot read history; removed members cannot read future messages.

### Message

A single entry in a thread or room. Carries a content type (`text`, `url`, `irys`, `ipfs`, or `arweave`) and a content field. Large or sensitive payloads are uploaded to Irys (or another store) and the message carries the pointer; clients resolve and decrypt it on read.

### Encryption

1:1 messages are encrypted with X25519 Diffie-Hellman before leaving the sender, with one or more readers. Group messages are encrypted under the room's broadcast epoch key. Wallets can use a deterministic wallet-derived key or register a separate Key account on-chain; raw-keypair clients (CLI, MCP, server) need no registration, while browser-wallet users register a key once.

### Escrow

Inbox owners can enable escrow: incoming payments are held in a per-thread escrow account until the receiver approves and withdraws.

## Quick examples

### Group chat (SDK)

```ts
import { PacketClient, PacketWallet } from "xpkt-sdk";

const adminClient = new PacketClient({ wallet: PacketWallet.fromKeypair(admin), connection });

// Admin creates a room and adds members.
const { client: room } = await adminClient.createRoom({ signMessage });
await room.addMember({ member: alice });
await room.addMember({ member: bob });

// Members send and read from just their wallet + RPC.
const aliceRoom = await aliceClient.room({ id: room.address });
await aliceRoom.messages().send({ text: "gm" });

const bobRoom = await bobClient.room({ id: room.address });
const messages = await bobRoom.loadMessages({ limit: 50 });
```

The same flow is available from the CLI (`packet room create | add | send | read`) and the MCP server (`packet_room_*`).

### 1:1 message (CLI)

```bash
packet config init --rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY --keypair ~/.config/solana/id.json
packet message new-thread --to <pubkey> --text "Hello"
```

Message send commands default to encrypt + upload; pass `--no-encrypt` or `--no-upload` only when plaintext or inline behavior is intentional.

## BGW parameters

Group chat relies on a global BGW parameter artifact (powers of a setup secret over BLS12-381), generated once and reused by every room. The SDK resolves it from a configurable source and ships a hosted Arweave-style default; override it with `configureDefaultBgwParams({ baseUrl })`.

## RPC requirement

Packet requires a ZK Compression / Photon-compatible RPC; a standard-only Solana RPC is not enough, because Packet reads and writes compressed accounts. Helius is the simplest setup:

```text
https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

See [RPC and Photon](https://docs.xpkt.dev/docs/concepts/rpc-photon) for details.

## Cost and storage notes

Packet is not gasless. Sending messages and creating threads are Solana transactions and can cost up to about `0.00005 SOL`. Creating an inbox costs more because it opens on-chain account state, but a custom inbox is not required for basic communication.

Keep raw content out of the compressed message account: use pointers for anything larger than about 128 bytes, otherwise transactions can fail from size/compute limits. Irys is the recommended store for durable encrypted bodies; you can also use IPFS, Arweave, HTTPS, or a custom server. The receiver fetches the stored link, so if the source disappears the on-chain message remains while the body becomes unreadable.

## Programs

`A3YNvikE96zn2PYrbqRa8hheH99ks7qt22zQiUF8Ttao` — Packet main program (inboxes, threads, messages, rooms, keys, users) on `mainnet` and `devnet`.

## License

APACHE 2.0
