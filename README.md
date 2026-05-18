# Packet

![image](https://xpkt.dev/assets/banner.png)

Packet is an on-chain messaging and order protocol built on Solana. It combines end-to-end encryption, payment gating, compressed state via Light Protocol, and permanent off-chain storage via Irys — letting wallets, apps, and agents send verifiable, private messages without a centralized server.

See full documentation at [docs.xpkt.dev](https://docs.xpkt.dev).

## Monorepo Structure

```
packet/
├── ts/          # TypeScript SDK (xpkt-sdk)
├── cli/         # CLI tool (xpkt)
```

### [`ts/`](./ts) — TypeScript SDK

**Package:** `xpkt-sdk`

The SDK for integrating Packet into TypeScript/JavaScript apps. Supports both browser (wallet-adapter) and Node.js (Keypair) environments.

```bash
npm install xpkt-sdk
```

See [ts/README.md](./ts/README.md) for full documentation.

### [`cli/`](./cli) — CLI

**Package:** `xpkt-cli` · **Binary:** `packet`

A terminal interface for Packet. Send encrypted messages, manage inboxes, upload to Irys, and configure your wallet — no code required.

```bash
npm install -g xpkt-cli
```

See [cli/README.md](./cli/README.md) for full documentation.

## Core Concepts

### Inbox

An on-chain account owned by a wallet. Acts as a directory of incoming threads. Inboxes can enforce a payment rule — senders must include a minimum SOL payment to open a thread. Multiple inboxes per wallet are supported (inbox 0, 1, 2, …).

### Thread

The conversation container between two wallets, created by the sender alongside the first message. Both parties can send messages by appending to the thread. Threads optionally hold an escrow balance.

### Message

A single entry in a thread. Carries a type (`text`, `url`, or `irys`) and a content field. Large or sensitive payloads are uploaded to Irys; the message stores the CID pointer.

### Encryption

Messages are encrypted with X25519 Diffie-Hellman before leaving the sender. A message can have multiple readers (sender + recipient). Wallets can use a deterministic wallet-derived key or register a separate Key account on-chain.

### Escrow

Inbox owners can enable escrow: incoming payments are held in a per-thread escrow account until the receiver approves and withdraws.

## Quick Example

**CLI:**

```bash
xpkt init config --rpc https://your-rpc --keypair ~/.config/solana/id.json
xpkt message new-thread --to <pubkey> --content "Hello" --encrypt
```

**SDK:**

```ts
import { PacketClient, PacketWallet } from "xpkt-sdk";

const client = new PacketClient({
  wallet: PacketWallet.fromKeypair(keypair),
  connection,
  photonRpc: { compressionApiEndpoint: "...", proverEndpoint: "..." },
});

await client.createThread({
  to: recipientPublicKey,
  messageType: MessageType.Irys,
  content: irysUrl,
});
```
---
## Programs

`A3YNvikE96zn2PYrbqRa8hheH99ks7qt22zQiUF8Ttao` - Packet main program (inboxes, threads, messages, keys, users) (`mainnet` and `devnet`)

---

## Status

Packet is experimental and actively evolving. APIs may change while the agent/order protocol and SDK surface are being finalized.

---

## License

MIT
