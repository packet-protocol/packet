import BN from "bn.js";
import type { PacketClient } from "../../../client";
import type { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import type { PacketProgram } from "../../../providers/program";
import type { RoomMemberAccountData, RoomMemberData } from "../type";
import * as anchor from "@anchor-lang/core";
import { roomMemberAddress, ROOM_MEMBER_LIGHT_DISCRIMINATOR } from "../utils/address";
import { getRoomCompressedAccount } from "../instructions/proofs";

/**
 * RoomMember borsh layout (Photon memcmp offsets):
 * - discriminator            @ 0  (8 bytes) = [127,146,39,153,243,115,198,230]
 * - version (u16)            @ 8
 * - owner (pubkey)           @ 10
 * - room (pubkey)            @ 42
 * - status (u8)              @ 74
 * - slot (u32)               @ 75
 * - joined_member_version    @ 79 (u64)
 * - secret (vec len u32)     @ 87
 */
const ROOM_MEMBER_OWNER_OFFSET = 10;
const ROOM_MEMBER_ROOM_OFFSET = 42;
const ROOM_MEMBER_STATUS_OFFSET = 74;

const ACTIVE_STATUS_BASE58 = bs58.encode(new Uint8Array([0]));

async function getCompressedActiveMemberAccountsForRoom(params: {
    client: PacketClient;
    room: PublicKey;
    cursor?: string;
    limit?: number;
}) {

    // status 0 = active, 1 = removed
    const ACTIVE_MEMBER_TYPE_BASE58 = bs58.encode(new Uint8Array([0]));

    const result = await params.client.lightRpc.getCompressedAccountsByOwner(
        params.client.program.programId,
        {
            cursor: params.cursor,
            limit: new BN(params.limit ?? 100),
            filters: [
                {
                    memcmp: {
                        offset: 0,
                        bytes: bs58.encode(ROOM_MEMBER_LIGHT_DISCRIMINATOR),
                        encoding: "base58",
                    },
                },
                {
                    memcmp: {
                        offset: ROOM_MEMBER_ROOM_OFFSET,
                        bytes: params.room.toBase58(),
                        encoding: "base58",
                    },
                },
                {
                    memcmp: {
                        offset: ROOM_MEMBER_STATUS_OFFSET,
                        bytes: ACTIVE_MEMBER_TYPE_BASE58,
                        encoding: "base58",
                    },
                }
            ],
        },
    );

    return result;
}

export const getActiveMemberAccountsForRoom = async (params: {
    client: PacketClient;
    room: PublicKey;
}) => {
    let cursor: string | undefined = undefined;
    const accounts: RoomMemberAccountData[] = [];

    while (true) {
        const result = await getCompressedActiveMemberAccountsForRoom({
            client: params.client,
            room: params.room,
            cursor,
        });

        accounts.push(...result.items.map((account) => DecodeMemberAccountData(params.client.program, account.data.data)));

        if (!result.cursor || result.items.length === 0) {
            break;
        }

        cursor = result.cursor;
    }

    return accounts;
};

/**
 * Discover every room a wallet is a member of, by scanning compressed
 * RoomMember accounts filtered on owner (offset {@link ROOM_MEMBER_OWNER_OFFSET}).
 * Each result carries its `room`, `slot`, and `status`, so this answers "which
 * groups am I in". Active-only by default (status 0); pass `activeOnly: false`
 * to include rooms the wallet was removed from.
 */
export const getRoomMembershipsForOwner = async (params: {
    client: PacketClient;
    owner: PublicKey;
    activeOnly?: boolean;
}): Promise<RoomMemberData[]> => {
    const activeOnly = params.activeOnly ?? true;

    const filters = [
        { memcmp: { offset: 0, bytes: bs58.encode(ROOM_MEMBER_LIGHT_DISCRIMINATOR), encoding: "base58" as const } },
        { memcmp: { offset: ROOM_MEMBER_OWNER_OFFSET, bytes: params.owner.toBase58(), encoding: "base58" as const } },
        ...(activeOnly
            ? [{ memcmp: { offset: ROOM_MEMBER_STATUS_OFFSET, bytes: ACTIVE_STATUS_BASE58, encoding: "base58" as const } }]
            : []),
    ];

    let cursor: string | undefined = undefined;
    const memberships: RoomMemberData[] = [];

    while (true) {
        const result = await params.client.lightRpc.getCompressedAccountsByOwner(
            params.client.program.programId,
            { cursor, limit: new BN(100), filters },
        );

        for (const item of result.items) {
            const decoded = DecodeMemberAccountData(params.client.program, item.data.data);
            const address = roomMemberAddress({
                room: decoded.room,
                owner: params.owner,
                programId: params.client.program.programId,
            });
            memberships.push(RoomMemberAccountToRoomMemberData(decoded, address));
        }

        if (!result.cursor || result.items.length === 0) {
            break;
        }
        cursor = result.cursor;
    }

    return memberships;
};

export function DecodeMemberAccountData(
    program: PacketProgram,
    data: Buffer
): RoomMemberAccountData {

    const coder = new anchor.BorshCoder(program.idl);

    return coder.types.decode(
        "roomMember",
        data,
    ) as RoomMemberAccountData;
}

export const RoomMemberAccountToRoomMemberData = (
    account: RoomMemberAccountData,
    address: PublicKey,
): RoomMemberData => {
    return {
        address,
        version: account.version,
        owner: account.owner,
        room: account.room,
        status: account.status,
        slot: account.slot,
        joinedMemberVersion: account.joinedMemberVersion,
        secret: Uint8Array.from(account.secret),
    };
};

/** Fetch a single member by its seed-derived compressed address (["room-member", room, owner]). */
export const GetRoomMemberAccount = async (
    client: PacketClient,
    room: PublicKey,
    owner: PublicKey,
): Promise<RoomMemberData | null> => {
    const address = roomMemberAddress({
        room,
        owner,
        programId: client.program.programId,
    });

    const account = await getRoomCompressedAccount(client.lightRpc, address);

    if (!account?.data) {
        return null;
    }

    const decoded = DecodeMemberAccountData(
        client.program,
        Buffer.from(account.data.data),
    );

    return RoomMemberAccountToRoomMemberData(decoded, address);
};
