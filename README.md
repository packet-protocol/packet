# Packet SDK (xpkt)

**xpkt** is a TypeScript SDK for Packet: a Solana-native communication and order protocol for humans, apps, and agents.

Packet is not only chat. It combines:

- **Sovereign inboxes** — on-chain endpoints that can act like decentralized mailboxes, storefronts, or agent APIs.
- **Encrypted content references** — messages point to content stored elsewhere, usually Irys, Arweave, IPFS, or a custom URL.
- **Payable payloads** — requests and payments can travel together in one protocol flow.
- **Escrowed threads** — paid inboxes can lock funds until both sides approve or a time lock allows withdrawal.
- **Compressed state** — activity, inbox pages, message accounts, and user key registries are designed for low-rent, scalable Solana usage.

> Recommended content model: keep on-chain message content as a URL or content reference. Irys is the recommended default for encrypted JSON bodies.

---

## Installation

```bash
npm install xpkt-sdk
```

Peer/runtime stack used by the SDK:

```bash
npm install @solana/web3.js @coral-xyz/anchor @lightprotocol/stateless.js bn.js
```

For frontend wallet support, use your normal Solana wallet adapter stack:

```bash
npm install @solana/wallet-adapter-react @solana/wallet-adapter-base
```

---

## Quick start

### Browser / wallet-adapter

```ts
import { Connection } from "@solana/web3.js";
import { PacketClient, PacketWallet } from "xpkt-sdk";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const packetWallet = PacketWallet.fromAdapter({
  publicKey: wallet.publicKey,
  signTransaction: wallet.signTransaction,
  signAllTransactions: wallet.signAllTransactions,
});

const client = new PacketClient({
  wallet: packetWallet,
  connection,
  photonRpc: {
    compressionApiEndpoint: "https://your-photon-endpoint",
    proverEndpoint: "https://your-prover-endpoint",
  },
});

await client.loadLookupTables();
```

### Node / localnet

```ts
import { Connection, Keypair } from "@solana/web3.js";
import { PacketClient, PacketWallet } from "xpkt-sdk";

const wallet = Keypair.generate();
const connection = new Connection("http://127.0.0.1:8899", "confirmed");

const client = new PacketClient({
  wallet: PacketWallet.fromKeypair(wallet),
  connection,
  photonRpc: {
    compressionApiEndpoint: "http://127.0.0.1:8784",
    proverEndpoint: "http://127.0.0.1:3001",
  },
});
```

---

## Core concepts

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

### Key registry

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

If no key is declared on-chain, apps may fall back to `SOLANA-ED25519-X25519` wallet-derived encryption when appropriate.

### Inbox

An inbox is a sovereign endpoint. It can be free, paid, escrow-paid, standard, or ephemeral.

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

### Paid inbox

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

### Escrow inbox

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

## Sending encrypted messages

Packet messages should usually contain a content URL/reference, not the whole plaintext body.

Recommended flow:

1. Build JSON payload, for example `{ subject, message }`.
2. Encrypt it with `client.crypto`.
3. Upload the encrypted JSON to Irys/Arweave/IPFS/custom storage.
4. Send the uploaded URL or content ID on-chain with `MessageType.Irys`, `MessageType.Arweave`, `MessageType.Ipfs`, or `MessageType.Url`.

```ts
import { MessageType } from "xpkt-sdk";

const recipientKey = await client.loadKey(recipientWallet);

const encryptedJson = await client.crypto.encryptToJson({
  plaintext: JSON.stringify({
    subject: "Build request",
    message: "Can you build this agent workflow by Friday?",
  }),
  readers: [recipientKey.Reader],
});

const contentUrl = await uploadEncryptedJsonToIrys(encryptedJson);

const thread = await client.createThread({
  to: recipientWallet,
  messageType: MessageType.Irys,
  content: contentUrl,
});
```

### Sending into an inbox

If the inbox has a payment rule, the SDK can build the required payment flow when creating the first thread.

```ts
const targetInbox = await client.inbox(inboxAddress);

const threadRes = await targetInbox.createThread({
  messageType: MessageType.Irys,
  content: contentUrl,
});
```

### Attaching manual payment to a normal message

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

## Loading activity, inboxes, threads, and messages

### Activity

Activity is a compressed segment of recent thread IDs for a wallet.

```ts
const activity = client.activity(client.walletPublicKey);
await activity.load();

const threads = await activity.loadThreads({
  limit: 20,
  includeLastMessage: true,
});
```

### Inbox threads

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

### Thread messages

```ts
const thread = await client.threadById(threadId);
await thread.load();

const last = await thread.loadLastMessage();
const messages = await thread.loadMessages({
  limit: 30,
  direction: "backward",
});
```

### Message content

For URL-backed messages, load the URL, parse encrypted JSON, then decrypt with the active crypto identity.

```ts
const encryptedBody = await fetch(contentUrl).then((r) => r.json());
const plaintext = await client.crypto.decrypt({ body: encryptedBody });
```

---

## Escrow lifecycle

If a thread has escrow payment info, both participants can approve. The receiver can withdraw when the protocol allows it.

```ts
await thread.approveEscrow({
  skipActivityCreation: true,
});

await thread.withdrawEscrow();
```

Apps should display escrow state near the thread header: amount, mint, approval status, release time, and whether funds were released.

---

## Realtime events

Packet emits message events from the program. Use event listeners for live UI updates, but do not rely on websocket events as your only indexer. Always backfill by loading activity/inbox/thread state.

Recommended app pattern:

```ts
// On app load
await client.activity().loadThreads({ includeLastMessage: true, limit: 20 });

// On new event
// refresh current thread or activity
```

---

## React usage pattern

A simple app usually keeps one `PacketClient` in context:

```tsx
import { createContext, useContext, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { PacketClient, PacketWallet } from "xpkt-sdk";

const PacketContext = createContext<PacketClient | null>(null);

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
      connection: new Connection("https://api.devnet.solana.com", "confirmed"),
      photonRpc: {
        compressionApiEndpoint: "https://your-photon-endpoint",
        proverEndpoint: "https://your-prover-endpoint",
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

## Local development

Typical local setup needs:

- Solana local validator
- Packet program deployed
- Light Protocol programs/accounts
- Photon/compression API
- Prover endpoint
- funded wallet and rent sponsor PDA

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

## Status

`xpkt` is experimental and actively evolving. APIs may change quickly while Packet’s agent/order protocol and SDK surface are being finalized.

---

## License

MIT