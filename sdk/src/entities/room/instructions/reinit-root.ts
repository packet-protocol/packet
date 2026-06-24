import type { Connection, PublicKey } from "@solana/web3.js";
import type { PacketIxOptions, PacketProgram } from "../../../index.js";
import type { Bytes } from "../../../types/common.js";

export type RoomReinitRootIxParams = {
    /* 32 byte */
    roomId: Bytes;
}

/**
 * Build the `room_reinit_root` instruction: admin-only reset of a poisoned room
 * to a fresh root ("genesis") state in a NEW era. Resets the room's epoch /
 * header / recipient / message-ordering mirrors and bumps `room.era`, keeping
 * the room identity (same PDA, same `roomId`, same `admin`, same params).
 *
 * No compressed-account proof is needed: this only mutates the on-chain Room
 * PDA. Headers / members for the new era are (re)created afterwards via the
 * normal publish-header / add-member flows under the bumped era.
 */
export const RoomReinitRootIx = async (
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomReinitRootIxParams,
    options?: PacketIxOptions,
) => {
    const sender = options?.owner ?? signer;

    const ix = await program.methods.roomReinitRoot(
        Array.from(params.roomId),
    ).accounts({
        signer: signer,
        sender: sender,
        permit: options?.permit ?? null,
    }).instruction();

    return ix;
}
