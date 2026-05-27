import { PublicKey } from "@solana/web3.js";
import { BN, InboxClient, PacketPDAs, type PacketClient } from "xpkt-sdk";
import { looksLikeBase58PublicKey } from "../input/index.js";

export const resolveTargetInbox = async (params: {
  client: PacketClient;
  owner: PublicKey;
  inbox?: string | number;
}): Promise<InboxClient | undefined> => {
  if (params.inbox === undefined || params.inbox === null || params.inbox === "") return undefined;

  const raw = String(params.inbox).trim();
  if (/^\d+$/.test(raw)) {
    const address = PacketPDAs.inbox(new BN(raw), params.owner);
    return await params.client.inbox(address);
  }

  if (looksLikeBase58PublicKey(raw)) {
    return await params.client.inbox(new PublicKey(raw));
  }

  throw new Error("inbox must be a numeric inbox id or inbox PDA address");
};

export const getThreadCounterparty = (thread: any, wallet: PublicKey): PublicKey => {
  const t = thread.Thread ?? thread;
  if (t.from.equals(wallet)) return t.to;
  if (t.to.equals(wallet)) return t.from;
  return t.to;
};
