import { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import { batchAddressTree, deriveAddressSeedV2, deriveAddressV2 } from "@lightprotocol/stateless.js";
import { sha256 } from "@noble/hashes/sha2";
import { PACKET_PROGRAM_ID } from "../../../constants.js";
import { u16Le, u64Le } from "../../../utils/bytes.js";
import { utf8 } from "../../../utils/encoding.js";
import type { Bytes } from "../../../types/common.js";

/**
 * Light compressed-account discriminator: `sha256(structName)[0..8]`
 * (light-sdk-macros `LightDiscriminator` derive). NOT the Anchor event
 * discriminator listed in the IDL `events` section — those differ, and using
 * them in Photon memcmp filters silently matches nothing.
 */
export function lightDiscriminator(structName: string): Buffer {
    return Buffer.from(sha256(utf8(structName)).slice(0, 8));
}

export const ROOM_MEMBER_LIGHT_DISCRIMINATOR = lightDiscriminator("RoomMember");
export const ROOM_MESSAGE_LIGHT_DISCRIMINATOR = lightDiscriminator("RoomMessage");
export const ROOM_HEADER_LIGHT_DISCRIMINATOR = lightDiscriminator("RoomEpochHeader");
export const ROOM_RECIPIENT_PAGE_LIGHT_DISCRIMINATOR = lightDiscriminator("RoomRecipientPage");

/**
 * Compressed-account address derivation for the room entity.
 *
 * Mirrors the on-chain seeds exactly (all integers little-endian) and uses the
 * same Light v2 derivation as the rest of the SDK (see `src/pda.ts`):
 * `deriveAddressV2(deriveAddressSeedV2(seeds), batchAddressTree, programId)`.
 *
 * `era` is the room generation (`room.era`): era 0 is the original room, and
 * each `room_reinit_root` reset bumps it. Folding `era` into every room
 * compressed-address seed gives a reset room a clean, never-used address
 * namespace while the room PDA / `room_id` stay the same.
 *
 * Seeds:
 * - member:  ["room-member",  room, era_le(8), owner]
 * - header:  ["room-header",  room, era_le(8), epoch_le(8)]
 * - message: ["room-message", room, era_le(8), client_msg_id(64)]
 * - page:    ["room-rpage",   room, era_le(8), epoch_le(8), page_index_le(2)]
 */

export const ROOM_MEMBER_SEED = "room-member";
export const ROOM_HEADER_SEED = "room-header";
export const ROOM_MESSAGE_SEED = "room-message";
export const ROOM_RECIPIENT_PAGE_SEED = "room-rpage";

const pid = (programId?: PublicKey) => programId ?? PACKET_PROGRAM_ID;
const addressTree = () => new PublicKey(batchAddressTree);
const s = (seed: string) => Buffer.from(seed);

export function roomMemberAddress(params: {
    room: PublicKey;
    /** Room generation (`room.era`). */
    era: BN | number;
    owner: PublicKey;
    programId?: PublicKey;
}): PublicKey {
    const seed = deriveAddressSeedV2([
        s(ROOM_MEMBER_SEED),
        params.room.toBuffer(),
        u64Le(params.era),
        params.owner.toBuffer(),
    ]);

    return deriveAddressV2(seed, addressTree(), pid(params.programId));
}

export function roomHeaderAddress(params: {
    room: PublicKey;
    /** Room generation (`room.era`). */
    era: BN | number;
    epoch: BN | number;
    programId?: PublicKey;
}): PublicKey {
    const seed = deriveAddressSeedV2([
        s(ROOM_HEADER_SEED),
        params.room.toBuffer(),
        u64Le(params.era),
        u64Le(params.epoch),
    ]);

    return deriveAddressV2(seed, addressTree(), pid(params.programId));
}

export function roomMessageAddress(params: {
    room: PublicKey;
    /** Room generation (`room.era`). */
    era: BN | number;
    clientMsgId: Bytes;
    programId?: PublicKey;
}): PublicKey {
    if (params.clientMsgId.length !== 64) {
        throw new Error(`clientMsgId must be 64 bytes, got ${params.clientMsgId.length}`);
    }

    const seed = deriveAddressSeedV2([
        s(ROOM_MESSAGE_SEED),
        params.room.toBuffer(),
        u64Le(params.era),
        Buffer.from(params.clientMsgId),
    ]);

    return deriveAddressV2(seed, addressTree(), pid(params.programId));
}

export function roomRecipientPageAddress(params: {
    room: PublicKey;
    /** Room generation (`room.era`). */
    era: BN | number;
    epoch: BN | number;
    pageIndex: number;
    programId?: PublicKey;
}): PublicKey {
    const seed = deriveAddressSeedV2([
        s(ROOM_RECIPIENT_PAGE_SEED),
        params.room.toBuffer(),
        u64Le(params.era),
        u64Le(params.epoch),
        u16Le(params.pageIndex),
    ]);

    return deriveAddressV2(seed, addressTree(), pid(params.programId));
}
