# xpkt CLI

A command-line interface for the [Packet Protocol](https://packet.chat) — send encrypted messages, manage inboxes, upload content to Irys, and interact with Solana wallets directly from your terminal.

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

```bash
# Import a private key
packet init config --rpc https://your-rpc-url --private-key <base58-key>

# Or point to an existing Solana CLI keypair
packet init config --rpc https://your-rpc-url --keypair ~/.config/solana/id.json
```

**2. Create an inbox:**

```bash
packet message create-inbox --inbox 0
```

**3. Send a message:**

```bash
packet message new-thread --to <recipient-pubkey> --content "Hello!"
```

**4. Read your inbox:**

```bash
packet message inbox 0
```

## Command Groups

| Group | Description |
|---|---|
| `init config` | Configure RPC endpoint and wallet |
| `message` | Send, read, and manage threads, inboxes, and escrow |
| `crypto` | Standalone encrypt/decrypt operations |
| `upload` | Upload files or raw content to Irys |

## Commands

### `init config`

Set up your RPC and wallet. Must be run before any other command.

```bash
packet init config --rpc <url> --private-key <base58>
packet init config --rpc <url> --keypair ~/.config/solana/id.json
```

Config is stored at:
- Linux: `~/.config/xpkt/config.toml`
- macOS: `~/Library/Preferences/xpkt/config.toml`
- Windows: `%APPDATA%\xpkt\Config\config.toml`

Private keys imported via `--private-key` are written to `wallet.json` with mode `0600`.

### `message`

```bash
# Send a new thread
packet message new-thread --to <pubkey> --content "Hello!"

# Send encrypted
packet message new-thread --to <pubkey> --content "Secret" --encrypt

# Upload a file and send the Irys CID
packet message new-thread --to <pubkey> --file ./doc.txt --upload --encrypt

# Reply to an existing thread
packet message new --thread <id> --content "Reply"

# List your inboxes
packet message inboxes

# Browse an inbox
packet message inbox 0

# View activity (all threads sent/received)
packet message activity

# Load messages from a thread
packet message messages --thread <id>

# Escrow
packet message escrow approve --thread <id>
packet message escrow withdraw --thread <id>

# Create inbox with payment wall
packet message create-inbox --inbox 0 --payment-sol 0.05 --escrow
```

### `crypto`

Encrypt or decrypt content outside of a message send.

```bash
# Encrypt for a recipient
packet crypto encrypt --to <pubkey> --content "Secret"

# Encrypt a file and save output
packet crypto encrypt --to <pubkey> --file ./doc.txt --out ./doc.enc.json

# Encrypt and upload to Irys
packet crypto encrypt --to <pubkey> --content "Secret" --upload

# Decrypt from a file
packet crypto decrypt --file ./doc.enc.json

# Decrypt from a URL
packet crypto decrypt --url https://gateway.irys.xyz/<cid>
```

### `upload`

Upload content to Irys (free tier for small payloads).

```bash
# Upload raw string
packet upload raw --content "hello world"

# Upload a file
packet upload file ./report.pdf
```

## Encryption

The CLI uses **wallet-derived X25519** encryption by default: your Ed25519 signing key is deterministically converted to an X25519 key. No separate key registration step is required.

If a recipient has registered a Key account on-chain, the SDK picks it up automatically. The sender is included as a reader by default so you can decrypt your own sent messages.

## License

MIT
