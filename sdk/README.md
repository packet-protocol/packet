# Packet SDK (xpkt)

**xpkt** is a TypeScript SDK for Packet: a Solana-native communication and order protocol for humans, apps, and agents.

Use the SDK when you are building directly in TypeScript. Use `xpkt-cli` when a human wants terminal commands. Use `xpkt-mcp` when an agent host needs Packet access through MCP tools and resources.

See full documentation at [docs.xpkt.dev](https://docs.xpkt.dev).

Packet is not only chat. It combines:

- **Sovereign inboxes:** on-chain endpoints that can act like decentralized mailboxes, storefronts, or agent APIs.
- **Encrypted content references:** messages point to content stored elsewhere, usually Irys, Arweave, IPFS, or a custom URL.
- **Payable payloads:** requests and payments can travel together in one protocol flow.
- **Escrowed threads:** paid inboxes can lock funds until both sides approve or a time lock allows withdrawal.
- **Compressed state:** activity, inbox pages, message accounts, and user key registries are designed for low-rent, scalable Solana usage.

> Recommended content model: keep on-chain message content as a URL or content reference. Irys is the recommended default for encrypted JSON bodies.

RPC note: Packet requires a ZK Compression / Photon-compatible RPC. Helius RPC is recommended; a standard-only Solana RPC will not work because Packet reads and writes compressed accounts.

Cost note: Packet is not gasless. Message sends and thread creation are Solana transactions and can cost up to about `0.00005 SOL`. Keep raw content out of the message account; use URL pointers for anything larger than about 128 bytes, otherwise transactions can fail from size/compute limits. Irys uploads under `100 KiB` are free on the current upload path; larger uploads require funding. Use about `2.50 USD / GB` as a rough planning estimate and check current Irys pricing for exact costs.

## Installation

```bash
npm install xpkt-sdk
```

Peer/runtime stack used by the SDK:

```bash
npm install @solana/web3.js @anchor-lang/core @lightprotocol/stateless.js bn.js
```

For frontend wallet support, use your normal Solana wallet adapter stack:

```bash
npm install @solana/wallet-adapter-react @solana/wallet-adapter-base
```

---

## Quick Start

### Browser / Wallet Adapter

```ts
import { Connection } from "@solana/web3.js";
import { PacketClient, PacketWallet } from "xpkt-sdk";

const rpc = "https://devnet.helius-rpc.com/?api-key=YOUR_KEY";
const connection = new Connection(rpc, "confirmed");

const packetWallet = PacketWallet.fromAdapter({
  publicKey: wallet.publicKey,
  signTransaction: wallet.signTransaction,
  signAllTransactions: wallet.signAllTransactions,
});

const client = new PacketClient({
  wallet: packetWallet,
  connection,
  photonRpc: {
    compressionApiEndpoint: rpc,
    proverEndpoint: rpc,
  },
  cluster: "devnet",
});

await client.loadLookupTables();
```

### Node

```ts
import { Connection, Keypair } from "@solana/web3.js";
import { PacketClient, PacketWallet } from "xpkt-sdk";

const wallet = Keypair.generate();
const rpc = "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY";
const connection = new Connection(rpc, "confirmed");

const client = new PacketClient({
  wallet: PacketWallet.fromKeypair(wallet),
  connection,
  photonRpc: {
    compressionApiEndpoint: rpc,
    proverEndpoint: rpc,
  },
  cluster: "mainnet"
});
```

---

## Core Concepts

### User

A user profile is a normal Packet PDA with a short display name, metadata URI, and optional agent identity link.

```ts
await client.createUser({
  name: "alice",
  uri: "https://example.com/alice.json",
});

const user = await client.loadUser();
console.log(user.name, user.uri, user.agent);
```

### Key Registry

A user key is a compressed public encryption key account. Other users or agents can load it and use it as a reader when encrypting a message.

```ts
await client.useWalletPasswordCrypto({
  password,
  signMessage: wallet.signMessage,
});

await client.createKeyFromCrypto();

const key = await client.loadKey();
const reader = key.Reader;
```

If no key is declared on-chain, apps may fall back to `SOLANA-ED25519-X25519` wallet-derived encryption when appropriate. Once a registered key is declared, senders that resolve it encrypt to that public key; make sure the reader has the matching private encryption identity or rotate/edit the key.

### Inbox

An inbox is a sovereign endpoint. It can be free, paid, escrow-paid, standard, or ephemeral.

Creating an inbox opens on-chain account state and can cost around 1 USD. It is not required for basic communication; use custom inboxes for named endpoints, metadata, payment rules, escrow, or separate routing.

```ts
import { BN, InboxKind } from "xpkt-sdk";
import { PublicKey } from "@solana/web3.js";

const inboxRes = await client.createInbox({
  inboxId: 0,
  inboxKind: InboxKind.Standard,
  metadata: {
    name: "Support Inbox",
    uri: "https://example.com/inbox.json",
  },
});

const inbox = inboxRes.client;
```

### Message Content

Packet message content can be a plain string, a `PacketContent`, or a `PacketMail` envelope:

```ts
type PacketMail = {
  subject?: string;
  message: PacketContent | PacketContent[] | string;
};

type PacketContent = {
  contentType: string;
  encoding: "base64" | "utf8";
  content: string;
};
```

Everything is still a string on the wire. Binary data is represented as `PacketContent` with `encoding: "base64"` and a MIME `contentType`. Clients decide how to render it.

Use envelope helpers when building or reading content so apps parse the same wire format:

```ts
import {
  PacketEnvelope,
  buildPacketEnvelopePayload,
  parsePacketEnvelopeText,
  renderPacketContent,
} from "xpkt-sdk";

const body = buildPacketEnvelopePayload({
  subject: "Report",
  content: "See attached.",
  contentType: "text/plain",
});

const parsed = parsePacketEnvelopeText(body);
console.log(parsed.subject);
console.log(parsed.message);
console.log(parsed.parts?.map(renderPacketContent));
```

Use `PacketEnvelope` when you need multiple content parts:

```ts
const multiPartBody = new PacketEnvelope()
  .mail("Report")
  .content({
    contentType: "text/markdown",
    encoding: "utf8",
    content: "Here is the file.",
  })
  .content({
    contentType: "application/pdf",
    encoding: "base64",
    content: pdfBase64,
  })
  .encode();
```

### Paid Inbox

A paid inbox requires payment when a thread is created into that inbox.

```ts
const paidInbox = await client.createInbox({
  inboxId: 1,
  inboxKind: InboxKind.Standard,
  metadata: {
    name: "Paid Requests",
    uri: "https://example.com/paid.json",
  },
  payment: {
    amount: new BN(100_000_000),
    mint: WSOL_MINT,
    escrowEnabled: false,
  },
});
```

### Escrow Inbox

An escrow inbox locks payment into the thread. Funds can be released by mutual approval or by the escrow rules configured in the protocol.

```ts
const escrowInbox = await client.createInbox({
  inboxId: 2,
  inboxKind: InboxKind.Standard,
  metadata: {
    name: "Escrow Orders",
    uri: "https://example.com/escrow.json",
  },
  payment: {
    amount: new BN(100_000_000),
    mint: WSOL_MINT,
    escrowEnabled: true,
  },
});
```

---

## Sending Encrypted Messages

Packet messages should usually contain a content URL/reference, not the whole plaintext body.

Recommended flow:

1. Build a Packet envelope payload, for example `{ subject, message }`.
2. Encrypt it with `client.crypto`.
3. Upload the encrypted JSON to Irys/Arweave/IPFS/custom storage.
4. Send the uploaded URL or content ID on-chain with `MessageType.Irys`, `MessageType.Arweave`, `MessageType.Ipfs`, or `MessageType.Url`.

```ts
import { buildPacketEnvelopePayload, MessageType } from "xpkt-sdk";

const recipientKey = await client.loadKey(recipientWallet);

const plaintext = buildPacketEnvelopePayload({
  subject: "Build request",
  content: "Can you build this agent workflow by Friday?",
  contentType: "text/plain",
});

const encryptedJson = await client.crypto.encryptToJson({
  plaintext,
  readers: [recipientKey.Reader],
});

const contentUrl = await uploadEncryptedJsonToIrys(encryptedJson);

const thread = await client.createThread({
  to: recipientWallet,
  messageType: MessageType.Irys,
  content: contentUrl,
});
```

### Sending Into An Inbox

If the inbox has a payment rule, the SDK can build the required payment flow when creating the first thread.

```ts
const targetInbox = await client.inbox(inboxAddress);

const threadRes = await targetInbox.createThread({
  messageType: MessageType.Irys,
  content: contentUrl,
});
```

### Attaching Manual Payment

Manual payment can be attached to normal sends when not already handled by a paid inbox rule.

```ts
await thread.sendMessage({
  messageType: MessageType.Irys,
  content: contentUrl,
  payment: {
    amount: new BN(10_000_000),
    mint: WSOL_MINT,
  },
});
```

---

### Inbox Threads

Standard inboxes use segmented pages. You can load the latest body, previous bodies, or search across body pages.

```ts
const inbox = await client.inbox(inboxAddress);

const latestThreads = await inbox.loadThreads({
  limit: 20,
  includeLastMessage: true,
});

const moreThreads = await inbox.loadThreadsAcrossBodies({
  limit: 50,
  maxPages: 3,
  includeLastMessage: true,
});
```

### Thread Messages

```ts
const thread = client.thread(threadId);
await thread.load();

const last = await thread.loadLastMessage();
const messages = await thread.loadMessages({
  limit: 30,
  direction: "backward",
});
```

### Message Content

Use `loadContent()` when you need the fetched body and content type. Text is only populated for textual MIME types; binary content stays bytes-first.

```ts
const message = await thread.loadLastMessage();
const loaded = await message.loadContent();

console.log(loaded.contentType);
console.log(loaded.text);
console.log(loaded.bytes);
```

Use `loadParsedContent()` when you want the normal Packet reader flow: load inline or external content, decrypt when requested, parse Packet envelope values, and classify text/binary media.

```ts
const parsed = await message.loadParsedContent({ decrypt: true });

console.log(parsed.subject);
console.log(parsed.message);
console.log(parsed.parts);
console.log(parsed.mediaKind); // "text" | "binary"
```

---

## Escrow Lifecycle

If a thread has escrow payment info, both participants can approve. The receiver can withdraw when the protocol allows it.

```ts
await thread.approveEscrow({
  skipActivityCreation: true,
});

await thread.withdrawEscrow();
```

Apps should display escrow state near the thread header: amount, mint, approval status, release time, and whether funds were released.

---

## Realtime Events

Packet emits message events from the program. Use event listeners for live UI updates, but do not rely on websocket events as your only indexer. Always backfill by loading activity/inbox/thread state.

```ts
const sub = client.messageEvents.listenIncoming({
  onMessage: async (message, event) => {
    console.log(event.threadId, event.msgSeq);
  },
});

await sub.stop();
```

Inbox clients can also listen for account-level inbox changes:

```ts
const sub = inbox.listenEvents({
  onChange: async (changedInbox, event) => {
    console.log(event.id.toString(), changedInbox.address.toBase58());
  },
});
```

---

## React Usage Pattern

A simple app usually keeps one `PacketClient` in context:

```tsx
import { createContext, useContext, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { PacketClient, PacketWallet } from "xpkt-sdk";

const PacketContext = createContext<PacketClient | null>(null);
const rpc = "https://devnet.helius-rpc.com/?api-key=YOUR_KEY";

export function PacketProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();

  const client = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      return null;
    }

    return new PacketClient({
      wallet: PacketWallet.fromAdapter({
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      }),
      connection: new Connection(rpc, "confirmed"),
      photonRpc: {
        compressionApiEndpoint: rpc,
        proverEndpoint: rpc,
      },
    });
  }, [wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);

  return <PacketContext.Provider value={client}>{children}</PacketContext.Provider>;
}

export function usePacket() {
  return useContext(PacketContext);
}
```

---

## Local Development

Typical local setup needs:

- Light test validator validator
- Packet program deployed
- funded wallet 

Example client config:

```ts
const client = new PacketClient({
  wallet: PacketWallet.fromKeypair(wallet),
  connection: "http://127.0.0.1:8899",
  photonRpc: {
    compressionApiEndpoint: "http://127.0.0.1:8784",
    proverEndpoint: "http://127.0.0.1:3001",
  },
});
```

Localnet wallet warnings are common when signing custom Light/Packet transactions. Wallet security scanners may be unable to verify local/custom programs or lookup tables.

---
## Programs

`A3YNvikE96zn2PYrbqRa8hheH99ks7qt22zQiUF8Ttao` - Packet main program (inboxes, threads, messages, keys, users) (`mainnet` and `devnet`)

---

## Status

`xpkt` is experimental and actively evolving. APIs may change quickly while Packet's agent/order protocol and SDK surface are being finalized.

---

## License

MIT
