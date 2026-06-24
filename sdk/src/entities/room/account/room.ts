import type { PublicKey } from "@solana/web3.js";
import type { PacketClient } from "../../../client.js";
import type { PacketProgram } from "../../../providers/program.js";
import type { Room, RoomAccountData } from "../type/index.js";

/** On-chain byte offset of Room.admin (8 discriminator + 2 version + 6 padding). */
export const ROOM_ADMIN_OFFSET = 16;

export const GetRoomAccount = async (
    program: PacketProgram,
    address: PublicKey,
): Promise<Room | null> => {
    const account = await program.account.room.fetchNullable(address);

    if (!account) {
        return null;
    }

    return RoomAccountToRoom(account, address);
};

export const RoomAccountToRoom = (
    account: RoomAccountData,
    address: PublicKey,
): Room => {
    return {
        address,
        roomId: Uint8Array.from(account.roomId),

        admin: account.admin,

        version: account.version,

        era: account.era,

        currentBucketLen: account.currentBucketLen,
        currentBucket: account.currentBucket,
        globalLen: account.globalLen,

        nextSlot: account.nextSlot,

        currentEpoch: account.currentEpoch,

        memberVersion: account.memberVersion,

        latestHeaderMemberVersion: account.latestHeaderMemberVersion,

        latestHeaderHash: Uint8Array.from(account.latestHeaderHash),

        paramsId: Uint8Array.from(account.paramsId),
        paramsRoot: Uint8Array.from(account.paramsRoot),

        recipientStateRoot: Uint8Array.from(account.recipientStateRoot),
        recipientCheckpointEpoch: account.recipientCheckpointEpoch,
        recipientDeltaDepth: account.recipientDeltaDepth,
        recipientMode: account.recipientMode,
        recipientEncoding: account.recipientEncoding,
        recipientExplicitCount: account.recipientExplicitCount,
        recipientAssignedUntilSlot: account.recipientAssignedUntilSlot,

        chainStartEpoch: account.chainStartEpoch,

        publicationOpen: account.publicationOpen,
        pendingEpoch: account.pendingEpoch,
        pendingPagesTotal: account.pendingPagesTotal,
        pendingPagesDone: account.pendingPagesDone,
        pendingPagesHash: Uint8Array.from(account.pendingPagesHash),
    };
};

/**
 * List all rooms administered by `admin` via getProgramAccounts with a memcmp
 * on Room.admin at on-chain offset {@link ROOM_ADMIN_OFFSET} (same pattern as
 * InboxClient.LoadMultiple's owner filter).
 */
export const GetRoomsByAdmin = async (params: {
    /** Either a PacketClient or a PacketProgram must be provided. */
    client?: PacketClient;
    program?: PacketProgram;
    admin: PublicKey;
    limit?: number;
}): Promise<Room[]> => {
    const program = params.program ?? params.client?.program;
    if (!program) {
        throw new Error("GetRoomsByAdmin requires a client or a program");
    }

    const accounts = await program.account.room.all([
        {
            memcmp: {
                offset: ROOM_ADMIN_OFFSET,
                bytes: params.admin.toBase58(),
            },
        },
    ]);

    const rooms = accounts.map((acc) => RoomAccountToRoom(acc.account, acc.publicKey));

    return params.limit !== undefined ? rooms.slice(0, params.limit) : rooms;
};
