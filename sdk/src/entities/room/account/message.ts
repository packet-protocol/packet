import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import bs58 from "bs58";
import * as anchor from "@anchor-lang/core";

import type { PacketClient } from "../../../client";
import type { PacketProgram } from "../../../providers/program";
import { u32Le } from "../../../utils/bytes";
import type { RoomMessageAccountData, RoomMessageData } from "../type";
import { getRoomCompressedAccount } from "../instructions/proofs";
import { ROOM_MESSAGE_LIGHT_DISCRIMINATOR } from "../utils/address";

/**
 * RoomMessage borsh layout (Photon memcmp offsets, computed from the IDL):
 * - discriminator            @ 0   (8 bytes) = [193,164,21,31,137,6,145,241]
 * - version (u16)            @ 8
 * - room (pubkey)            @ 10
 * - crypto_epoch (u64)       @ 42
 * - global_seq (u64)         @ 50
 * - bucket (u32, LE)         @ 58
 * - bucket_index (u8)        @ 62
 * - sender (pubkey)          @ 63
 * - member_slot (u32)        @ 95
 * - client_msg_id ([u8;64])  @ 99
 * - timestamp (i64)          @ 163
 * - message_type (enum tag)  @ 171 (1 byte tag; +2 payload bytes for Other(u16))
 * - content (vec len u32)    @ 172 (variable; 174 when message_type == Other)
 *
 * The room pubkey lives in DATA (offset 10), so Photon can memcmp-filter
 * messages directly by room (and by room + bucket for bucket loads).
 */
/** Light discriminator (sha256("RoomMessage")[0..8]) — NOT the Anchor event discriminator. */
export const ROOM_MESSAGE_DISCRIMINATOR = ROOM_MESSAGE_LIGHT_DISCRIMINATOR;
export const ROOM_MESSAGE_ROOM_OFFSET = 10;
export const ROOM_MESSAGE_CRYPTO_EPOCH_OFFSET = 42;
export const ROOM_MESSAGE_GLOBAL_SEQ_OFFSET = 50;
export const ROOM_MESSAGE_BUCKET_OFFSET = 58;
export const ROOM_MESSAGE_BUCKET_INDEX_OFFSET = 62;
export const ROOM_MESSAGE_SENDER_OFFSET = 63;
export const ROOM_MESSAGE_MEMBER_SLOT_OFFSET = 95;
export const ROOM_MESSAGE_CLIENT_MSG_ID_OFFSET = 99;

/** Messages per bucket (program: Room::MAX_BUCKET_LEN). */
export const ROOM_MESSAGE_BUCKET_SIZE = 100;

export function DecodeRoomMessageAccountData(
    program: PacketProgram,
    data: Uint8Array | Buffer | string,
): RoomMessageAccountData {
    const raw =
        typeof data === "string"
            ? Buffer.from(data, "base64")
            : Buffer.from(data);

    const coder = new anchor.BorshCoder(program.idl);

    return coder.types.decode(
        "roomMessage",
        raw,
    ) as RoomMessageAccountData;
}

export const RoomMessageAccountToRoomMessage = (
    account: RoomMessageAccountData,
    address: PublicKey,
): RoomMessageData => {
    return {
        address,
        version: account.version,
        room: account.room,
        cryptoEpoch: account.cryptoEpoch,
        globalSeq: account.globalSeq,
        bucket: account.bucket,
        bucketIndex: account.bucketIndex,
        sender: account.sender,
        memberSlot: account.memberSlot,
        clientMsgId: Uint8Array.from(account.clientMsgId),
        timestamp: account.timestamp,
        messageType: account.messageType,
        content: Uint8Array.from(account.content),
    };
};

/** Fetch a single message by its derived compressed address. */
export const GetRoomMessageAccount = async (
    client: PacketClient,
    address: PublicKey,
): Promise<RoomMessageData | null> => {
    const account = await getRoomCompressedAccount(client.lightRpc, address);

    if (!account?.data) {
        return null;
    }

    const decoded = DecodeRoomMessageAccountData(client.program, account.data.data);

    return RoomMessageAccountToRoomMessage(decoded, address);
};

const roomMessageMemcmpFilters = (params: {
    room: PublicKey;
    bucket?: number;
    sender?: PublicKey;
}) => [
    {
        memcmp: {
            offset: 0,
            bytes: bs58.encode(ROOM_MESSAGE_DISCRIMINATOR),
            encoding: "base58" as const,
        },
    },
    {
        memcmp: {
            offset: ROOM_MESSAGE_ROOM_OFFSET,
            bytes: params.room.toBase58(),
            encoding: "base58" as const,
        },
    },
    ...(params.bucket !== undefined
        ? [
            {
                memcmp: {
                    offset: ROOM_MESSAGE_BUCKET_OFFSET,
                    bytes: bs58.encode(u32Le(params.bucket)),
                    encoding: "base58" as const,
                },
            },
        ]
        : []),
    ...(params.sender
        ? [
            {
                memcmp: {
                    offset: ROOM_MESSAGE_SENDER_OFFSET,
                    bytes: params.sender.toBase58(),
                    encoding: "base58" as const,
                },
            },
        ]
        : []),
];

const decodeRoomMessageItems = (params: {
    client: PacketClient;
    room: PublicKey;
    items: Awaited<ReturnType<PacketClient["lightRpc"]["getCompressedAccountsByOwner"]>>["items"];
}): RoomMessageData[] => {
    const out: RoomMessageData[] = [];

    for (const item of params.items) {
        if (!item.data?.data || !item.address) {
            continue;
        }

        const decoded = DecodeRoomMessageAccountData(
            params.client.program,
            item.data.data,
        );

        // Cheap sanity check on top of the memcmp filter.
        if (!decoded.room.equals(params.room)) {
            continue;
        }

        out.push(RoomMessageAccountToRoomMessage(decoded, new PublicKey(item.address)));
    }

    return out;
};

export type GetRoomMessagesByRoomResult = {
    items: RoomMessageData[];
    cursor: string | null;
};

/**
 * List room messages via Photon getCompressedAccountsByOwner with a direct
 * memcmp on the room pubkey (offset 10), optionally narrowed by sender.
 * `cursor`/`limit` page through the Photon scan.
 */
export const GetRoomMessagesByRoom = async (params: {
    client: PacketClient;
    room: PublicKey;
    /** Optional additional memcmp filter on the sender (offset 63). */
    sender?: PublicKey;
    cursor?: string;
    limit?: number;
}): Promise<GetRoomMessagesByRoomResult> => {
    const result = await params.client.lightRpc.getCompressedAccountsByOwner(
        params.client.program.programId,
        {
            cursor: params.cursor,
            limit: new BN(params.limit ?? ROOM_MESSAGE_BUCKET_SIZE),
            filters: roomMessageMemcmpFilters({ room: params.room, sender: params.sender }),
        },
    );

    return {
        items: decodeRoomMessageItems({ client: params.client, room: params.room, items: result.items }),
        cursor: result.cursor ?? null,
    };
};

/**
 * Fetch one whole message bucket (≤ {@link ROOM_MESSAGE_BUCKET_SIZE} items) in
 * a single logical query: memcmp on discriminator + room (offset 10) + bucket
 * (u32 LE at offset 58), looping the Photon cursor internally until the bucket
 * is exhausted. Returns messages sorted by globalSeq ascending.
 */
export const GetRoomMessagesBucket = async (params: {
    client: PacketClient;
    room: PublicKey;
    bucket: number;
    /** Max messages to return (defaults to the full bucket). */
    limit?: number;
    /** Photon cursor to resume an interrupted bucket scan from. */
    cursor?: string;
    /** Photon page size per RPC call (defaults to the bucket size). */
    batchSize?: number;
}): Promise<RoomMessageData[]> => {
    const limit = params.limit ?? ROOM_MESSAGE_BUCKET_SIZE;
    const batchSize = params.batchSize ?? ROOM_MESSAGE_BUCKET_SIZE;
    const items: RoomMessageData[] = [];

    let cursor: string | undefined = params.cursor;

    while (items.length < limit) {
        const result = await params.client.lightRpc.getCompressedAccountsByOwner(
            params.client.program.programId,
            {
                cursor,
                limit: new BN(batchSize),
                filters: roomMessageMemcmpFilters({ room: params.room, bucket: params.bucket }),
            },
        );

        items.push(...decodeRoomMessageItems({ client: params.client, room: params.room, items: result.items }));

        if (!result.cursor) {
            break;
        }

        cursor = result.cursor;
    }

    items.sort((a, b) => a.globalSeq.cmp(b.globalSeq));

    return items.length > limit ? items.slice(0, limit) : items;
};
