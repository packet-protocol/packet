# Packet CLI (xpkt-cli)

A command-line interface for the [Packet Protocol](https://packet.chat): send encrypted messages, manage inboxes, upload content to Irys, and interact with Solana wallets directly from your terminal.

Use the CLI when a human wants terminal commands. Use `xpkt-mcp` when an agent host needs Packet access through MCP tools and resources.

See full documentation at [docs.xpkt.dev](https://docs.xpkt.dev).

## Installation

```bash
npm install -g xpkt-cli
```

Then run `packet --help` for a full list of commands and options.

Or run without installing:

```bash
npx xpkt-cli --help
```

Requires Node.js 20+.

## Quick Start

**1. Configure your wallet and RPC:**

Packet requires a ZK Compression / Photon-compatible RPC. Helius RPC is recommended; a standard-only Solana RPC will not work because Packet reads and writes compressed accounts.

```bash
# Import a private key
packet config init --rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY --private-key <base58-key>

# Or point to an existing Solana CLI keypair
packet config init --rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY --keypair ~/.config/solana/id.json
```

**2. Create an inbox:**

```bash
packet message create-inbox --inbox 0
```

**3. Send a message:**

```bash
packet message new-thread --to <recipient-pubkey> --text "Hello!"
```

Message send commands default to **encrypt + upload**. The transaction stores an Irys CID and the payload is encrypted before upload. Pass `--no-encrypt` or `--no-upload` only when you intentionally want plaintext or inline behavior.

Packet is not gasless. Message sends and thread creation are Solana transactions and can cost up to about `0.00005 SOL`; 1 USD of SOL covers roughly 200 simple messages. Creating an inbox can cost around 1 USD because it opens on-chain account state, but a custom inbox is not required for basic communication. Keep raw content out of the message account; use URL pointers for anything larger than about 128 bytes, otherwise transactions can fail from size/compute limits.

**4. Read your inbox:**

```bash
packet message inbox 0
```

## Command Groups

| Group | Description |
|---|---|
| `config` | Configure RPC endpoint and wallet; inspect config with `view` and `whoami` |
| `message` | Send, read, and manage threads, inboxes, and escrow |
| `crypto` | Standalone encrypt/decrypt operations |
| `upload` | Upload files or raw content to Irys |

## Commands

### `config`

Set up your RPC and wallet. Must be run before any other command. The RPC must support ZK Compression / Photon; Helius RPC is recommended.

```bash
packet config init --rpc <url> --private-key <base58>
packet config init --rpc <url> --keypair ~/.config/solana/id.json
packet config init --rpc <url> # update RPC only after a wallet is configured
packet config view
packet config whoami
```

Config is stored at:
- Linux: `~/.config/xpkt/config.toml`
- macOS: `~/Library/Preferences/xpkt/config.toml`
- Windows: `%APPDATA%\xpkt\Config\config.toml`

Private keys imported via `--private-key` are written to `wallet.json` with mode `0600`.

### `message`

```bash
# Send a new thread
packet message new-thread --to <pubkey> --text "Hello!"

# Send a multi-part Packet envelope
packet message new-thread --to <pubkey> --subject "Report" --text "See attached." --file ./report.pdf

# Send plaintext inline only when intentional
packet message new-thread --to <pubkey> --content "public note" --no-upload --no-encrypt

# Reply to an existing thread
packet message new --thread <id> --text "Reply"

# List your inboxes
packet message inboxes

# Browse an inbox
packet message inbox 0

# View activity (all threads sent/received)
packet message activity

# Load messages from a thread
packet message messages --thread <id>

# Wait for live events. This does not replay missed messages.
packet message events --incoming --count 1

# Escrow
packet message escrow approve --thread <id>
packet message escrow withdraw --thread <id>

# Create inbox with payment wall
packet message create-inbox --inbox 0 --payment-sol 0.05 --escrow
```

For every argument and flag, see the CLI section in the docs or run `packet <group> <command> --help`.

### `crypto`

Encrypt or decrypt content outside of a message send.

```bash
# Encrypt for a recipient
packet crypto encrypt --to <pubkey> --text "Secret"

# Encrypt a multi-part Packet envelope and save output
packet crypto encrypt --to <pubkey> --text "See attached." --file ./doc.txt --out ./doc.enc.json

# Encrypt and upload to Irys
packet crypto encrypt --to <pubkey> --text "Secret" --upload

# Decrypt from a file
packet crypto decrypt --file ./doc.enc.json

# Decrypt from a URL
packet crypto decrypt --url https://gateway.irys.xyz/<cid>
```

### `upload`

Upload content to Irys. Irys uploads under `100 KiB` are free on the current upload path; larger uploads require funding. The CLI uses the configured wallet and attempts the required Irys funding/payment automatically. Use about `2.50 USD / GB` as a rough planning estimate and check current Irys pricing for exact costs.

```bash
# Upload raw string
packet upload raw --content "hello world"

# Upload a file
packet upload file ./report.pdf
```

## Encryption

The CLI uses **wallet-derived Ed25519-to-X25519** encryption by default: your Ed25519 signing key is deterministically converted to an X25519 key. No separate key registration step is required.

The CLI does not manage custom registered Key account private material. For CLI-only wallets, you usually should not create a registered Key account. If a wallet has a registered Key account, senders that resolve it encrypt to that registered public key and the matching private encryption identity is required to decrypt.

## Packet Envelopes

Use `--text` and `--file` to build Packet envelope content. Text parts render as text. Non-text parts remain structured attachments with content type, byte size, and downloadable bytes after decryption/load.

Use `--content` for a single body or existing pointer-like value. Use `--url` when you already have a URL pointer.

Irys is recommended because sent message bodies should remain durable. You can use IPFS, Arweave, HTTPS, or a custom server, but the receiver must be able to fetch the stored link later. If that resource disappears, the on-chain message can remain while the body becomes unreadable.

## MCP

For Claude, Codex, Hermes, OpenClaw, and other MCP clients, use `xpkt-mcp` instead of shelling out to the CLI. The MCP server exposes the same core workflows as tools and adds resource subscriptions for live wake-up:

```bash
npx -y xpkt-mcp
```

## License

MIT
