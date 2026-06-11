import type { PublicKey } from "@solana/web3.js";
import { bytesToHex, type Room, type RoomMessageData } from "xpkt-sdk";
import { shortKey } from "../message/format.js";

const bnStr = (value: { toString(): string } | null | undefined): string =>
  value == null ? "0" : value.toString();

export const roomInfoObject = (room: Room) => ({
  address: room.address.toBase58(),
  roomId: bytesToHex(room.roomId),
  admin: room.admin.toBase58(),
  version: room.version,
  globalLen: bnStr(room.globalLen),
  nextSlot: room.nextSlot,
  currentEpoch: bnStr(room.currentEpoch),
  memberVersion: bnStr(room.memberVersion),
  latestHeaderMemberVersion: bnStr(room.latestHeaderMemberVersion),
  chainStartEpoch: bnStr(room.chainStartEpoch),
  recipientDeltaDepth: room.recipientDeltaDepth,
  recipientMode: room.recipientMode,
  recipientExplicitCount: room.recipientExplicitCount,
  recipientAssignedUntilSlot: room.recipientAssignedUntilSlot,
  publicationOpen: room.publicationOpen,
  paramsId: bytesToHex(room.paramsId),
});

export const roomInfoText = (room: Room): string => {
  const o = roomInfoObject(room);
  return [
    `room ${o.address}`,
    `roomId=${o.roomId}`,
    `admin=${shortKey(o.admin)} epoch=${o.currentEpoch} members=${o.nextSlot - 1} (nextSlot=${o.nextSlot})`,
    `messages=${o.globalLen} memberVersion=${o.memberVersion} deltaDepth=${o.recipientDeltaDepth} publicationOpen=${o.publicationOpen}`,
    `paramsId=${o.paramsId}`,
  ].join("\n");
};

export type RoomMemberAccountLike = {
  owner: PublicKey;
  slot: number;
  status: number;
  joinedMemberVersion: { toString(): string };
};

export const memberObject = (m: RoomMemberAccountLike) => ({
  owner: m.owner.toBase58(),
  slot: m.slot,
  status: m.status === 0 ? "active" : "removed",
  joinedMemberVersion: bnStr(m.joinedMemberVersion),
});

export const memberText = (m: ReturnType<typeof memberObject>): string =>
  `slot ${m.slot} ${shortKey(m.owner)} ${m.status} joined@${m.joinedMemberVersion}`;

export type RoomMessageRow = {
  address: string;
  seq: string;
  epoch: string;
  sender: string;
  memberSlot: number;
  time: string;
  locked: boolean;
  text: string | null;
  status: "decrypted" | "locked" | "failed";
  error?: string;
};

export const messageRow = (
  message: RoomMessageData,
  decrypt: { status: "decrypted" | "locked" | "failed"; text?: string; error?: string },
  // Resolved content (e.g. the fetched Irys body) to prefer over the raw
  // decrypted value (which for Irys-typed messages is only the pointer URL).
  resolvedText?: string,
): RoomMessageRow => ({
  address: message.address.toBase58(),
  seq: bnStr(message.globalSeq),
  epoch: bnStr(message.cryptoEpoch),
  sender: message.sender.toBase58(),
  memberSlot: message.memberSlot,
  time: new Date(Number(bnStr(message.timestamp)) * 1000).toISOString(),
  locked: decrypt.status === "locked",
  text: decrypt.status === "decrypted" ? (resolvedText ?? decrypt.text ?? null) : null,
  status: decrypt.status,
  error: decrypt.error,
});

export const messageRowText = (row: RoomMessageRow): string => {
  const head = `#${row.seq} ${shortKey(row.sender)} epoch=${row.epoch} ${row.time}`;
  if (row.status === "decrypted") return `${head}\n${row.text ?? "[non-text content]"}`;
  if (row.status === "locked") return `${head}\n[locked: not a recipient of epoch ${row.epoch}]`;
  return `${head}\n[decrypt failed: ${row.error ?? "unknown"}]`;
};
