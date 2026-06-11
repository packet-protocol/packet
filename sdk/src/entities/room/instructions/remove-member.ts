import type { Connection, PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";

import type { PacketProgram } from "../../../providers/program";
import type { PacketIxOptions } from "../../transaction/types";
import type { Bytes } from "../../../types/common";
import * as Pda from "../../../pda";
import { roomMemberAddress } from "../utils/address";
import type { RoomMemberAccountData } from "../type";
import { getRoomUpdateAccountProof } from "./proofs";

export type RoomRemoveMemberIxParams = {
    /* 32 byte */
    roomId: Bytes;

    /** Wallet of the member to remove (RoomMember.owner). */
    member: PublicKey;

    /** Encrypted BGW user-secret envelope (kept on the removed member account). */
    bgwMemberSecret: Bytes;
}

export const RoomRemoveMemberIx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomRemoveMemberIxParams,
    options?: PacketIxOptions,
) => {
    const sender = options?.owner ?? signer;

    const room = Pda.roomPda(params.roomId, program.programId);

    const memberAddress = roomMemberAddress({
        room,
        owner: params.member,
        programId: program.programId,
    });

    const proofResult = await getRoomUpdateAccountProof<RoomMemberAccountData>({
        rpc,
        program,
        address: memberAddress,
        typeName: "roomMember",
        label: "RoomMember",
    });

    const ix = await program.methods.roomRemoveMember(
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
