import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import * as anchor from "@anchor-lang/core";
import type { PacketIDL } from "../../../idl/packet.idl";

export interface Room {
    address: PublicKey,
    roomId: Uint8Array,

    admin: PublicKey,

    version: number,

    currentBucketLen: number,
    currentBucket: number,
    globalLen: BN,

    /** 1-based next member slot (u32). */
    nextSlot: number,

    currentEpoch: BN,

    memberVersion: BN,

    latestHeaderMemberVersion: BN,

    latestHeaderHash: Uint8Array,

    paramsId: Uint8Array,
    paramsRoot: Uint8Array,

    /** Current recipient root-chain state root. */
    recipientStateRoot: Uint8Array,
    /** Epoch of the last recipient checkpoint (root chain anchor). */
    recipientCheckpointEpoch: BN,
    /** Delta depth since the last checkpoint. */
    recipientDeltaDepth: number,
    /** RecipientMode of the current recipient state. */
    recipientMode: number,
    /** RecipientEncoding of the last checkpoint. */
    recipientEncoding: number,
    /** Explicit slot count of the current recipient state. */
    recipientExplicitCount: number,
    /** Highest slot ever activated (recipient chain mirror). */
    recipientAssignedUntilSlot: number,

    /** Epoch where the current key-chain segment began. */
    chainStartEpoch: BN,

    /** 1 while a staged (two-phase) publication is open. */
    publicationOpen: number,
    /** Epoch of the open staged publication (current_epoch + 1 while open). */
    pendingEpoch: BN,
    /** Total pages of the open staged publication. */
    pendingPagesTotal: number,
    /** Pages staged so far for the open publication. */
    pendingPagesDone: number,
    /** Running page chain hash of the open staged publication. */
    pendingPagesHash: Uint8Array,
}

/** RoomMember compressed account, idiomatic TS shape. */
export interface RoomMemberData {
    /** Derived compressed account address (["room-member", room, owner]). */
    address: PublicKey,
    version: number,
    owner: PublicKey,
    room: PublicKey,
    /** 0 = active, 1 = removed. */
    status: number,
    /** 1-based member slot (u32). */
    slot: number,
    /** Member version of the mutation that created / last re-activated this member. */
    joinedMemberVersion: BN,
    /** Encrypted BGW user-secret envelope. */
    secret: Uint8Array,
}

/** RoomEpochHeader compressed account, idiomatic TS shape. */
export interface RoomEpochHeaderData {
    /** Derived compressed account address (["room-header", room, epoch_le]). */
    address: PublicKey,
    version: number,
    room: PublicKey,
    epoch: BN,
    memberVersion: BN,
    headerBindingRoot: Uint8Array,

    /** RecipientDescriptorKind. */
    descriptorKind: number,
    /** RecipientMode (state AFTER this header). */
    recipientMode: number,
    /** RecipientEncoding (checkpoints; Empty for Reuse/Delta). */
    recipientEncoding: number,
    /** RecipientDeltaOp (None unless kind == Delta). */
    deltaOp: number,
    /** 0 unless kind == Delta. */
    deltaSlot: number,
    /** Depth AFTER this header (0 for checkpoints). */
    deltaDepth: number,
    assignedUntilSlot: number,
    explicitCount: number,
    chainStartEpoch: BN,
    recipientStateRoot: Uint8Array,
    headerHash: Uint8Array,
    /** Inline checkpoint payload; pages-hash (32B) for External; empty for Reuse/Delta. */
    descriptorBytes: Uint8Array,
    /** Opaque BGW core + wrapped chain key (client-defined). */
    headerBytes: Uint8Array,
}

/** RoomMessage compressed account, idiomatic TS shape. */
export interface RoomMessageData {
    /** Derived compressed account address (["room-message", room, client_msg_id]). */
    address: PublicKey,
    version: number,
    /** Room PDA this message belongs to (in DATA so Photon can memcmp by room). */
    room: PublicKey,
    cryptoEpoch: BN,
    globalSeq: BN,
    bucket: number,
    bucketIndex: number,
    sender: PublicKey,
    /** Sender member slot (u32). */
    memberSlot: number,
    /** 64-byte client message id. */
    clientMsgId: Uint8Array,
    timestamp: BN,
    messageType: anchor.IdlTypes<PacketIDL>["messageType"],
    content: Uint8Array,
}

/** RoomRecipientPage compressed account, idiomatic TS shape. */
export interface RoomRecipientPageData {
    /** Derived compressed account address (["room-rpage", room, epoch_le, page_index_le]). */
    address: PublicKey,
    version: number,
    room: PublicKey,
    /** The pending epoch this page belongs to. */
    epoch: BN,
    pageIndex: number,
    pagesTotal: number,
    /** sha256(payload). */
    payloadHash: Uint8Array,
    /** Byte chunk of the canonical checkpoint descriptor_bytes. */
    payload: Uint8Array,
}

export type RoomMemberAccountData = anchor.IdlEvents<PacketIDL>["roomMember"];

/** Raw Anchor decode shapes (BorshCoder output). */
export type RoomAccountData = anchor.IdlAccounts<PacketIDL>["room"];
export type RoomEpochHeaderAccountData = anchor.IdlTypes<PacketIDL>["roomEpochHeader"];
export type RoomMessageAccountData = anchor.IdlTypes<PacketIDL>["roomMessage"];
export type RoomRecipientPageAccountData = anchor.IdlTypes<PacketIDL>["roomRecipientPage"];
