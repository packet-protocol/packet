import type { Connection, PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type BN from "bn.js";

import type { PacketProgram } from "../../../providers/program.js";
import type { PacketIxOptions } from "../../transaction/types.js";
import type { Bytes } from "../../../types/common.js";
import * as Pda from "../../../pda.js";
import { roomMemberAddress } from "../utils/address.js";
import type { RoomMemberAccountData } from "../type/index.js";
import { getRoomCreateOrUpdateAccountProof } from "./proofs.js";

export type RoomAddMemberIxParams = {
    /* 32 byte */
    roomId: Bytes;

    /** Room generation (`room.era`). */
    era: BN | number;

    /** Wallet of the member to add (RoomMember.owner). */
    member: PublicKey;

    /** Encrypted BGW user-secret envelope for the member. */
    bgwMemberSecret: Bytes;
}

export const RoomAddMemberIx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomAddMemberIxParams,
    options?: PacketIxOptions,
) => {
    const sender = options?.owner ?? signer;

    const room = Pda.roomPda(params.roomId, program.programId);

    const memberAddress = roomMemberAddress({
        room,
        era: params.era,
        owner: params.member,
        programId: program.programId,
    });

    // Create on first add, update on re-activation.
    const proofResult = await getRoomCreateOrUpdateAccountProof<RoomMemberAccountData>({
        rpc,
        program,
        address: memberAddress,
        typeName: "roomMember",
        label: "RoomMember",
    });

    const ix = await program.methods.roomAddMember(
        Array.from(params.roomId),
        {
            proof: proofResult.proof,
            member: params.member,
            bgwMemberSecret: Buffer.from(params.bgwMemberSecret),
        },
    ).accounts({
        signer: signer,
        sender: sender,
        permit: options?.permit ?? null,
    }).remainingAccounts(proofResult.metas.remainingAccounts)
        .instruction();

    return ix;
}
