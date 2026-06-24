import type { Connection, PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type BN from "bn.js";

import type { PacketProgram } from "../../../providers/program.js";
import type { PacketIxOptions } from "../../transaction/types.js";
import type { Bytes } from "../../../types/common.js";
import * as Pda from "../../../pda.js";
import { toBN } from "../../../utils/bytes.js";
import { roomHeaderAddress } from "../utils/address.js";
import { getRoomCreateAccountsProof } from "./proofs.js";

export type RoomPublishHeaderIxParams = {
    /* 32 byte */
    roomId: Bytes;

    /** Room generation (`room.era`). */
    era: BN | number;

    /** Must equal room.currentEpoch + 1. */
    epoch: BN | number;
    /** Must equal room.memberVersion. */
    memberVersion: BN | number;
    /* 32 byte */
    headerBindingRoot: Bytes;

    /** RecipientDescriptorKind (Reuse 0 / Delta 1 / InlineCheckpoint 2 / ExternalCheckpoint 3). */
    descriptorKind: number;
    /** RecipientMode (Include 0 / Exclude 1). */
    recipientMode: number;
    /** RecipientEncoding (Empty 0 / DeltaVarint 1 / Ranges 2 / Bitmap 3). */
    recipientEncoding: number;
    /** RecipientDeltaOp (None 0 / Activate 1 / Remove 2). */
    deltaOp: number;
    /** 0 unless descriptorKind == Delta. */
    deltaSlot: number;
    assignedUntilSlot: number;
    explicitCount: number;
    chainBreak: boolean;

    /** Inline checkpoint payload; empty for Reuse/Delta/ExternalCheckpoint. */
    descriptorBytes: Bytes;
    /** Opaque BGW core + wrapped chain key (client-defined). */
    headerBytes: Bytes;
}

export const RoomPublishHeaderIx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomPublishHeaderIxParams,
    options?: PacketIxOptions,
) => {
    const sender = options?.owner ?? signer;

    const room = Pda.roomPda(params.roomId, program.programId);

    const headerAddress = roomHeaderAddress({
        room,
        era: params.era,
        epoch: params.epoch,
        programId: program.programId,
    });

    const proofResult = await getRoomCreateAccountsProof({
        rpc,
        programId: program.programId,
        addresses: [headerAddress],
    });

    const ix = await program.methods.roomPublishHeader(
        Array.from(params.roomId),
        {
            proof: proofResult.createAccountsProof,
            epoch: toBN(params.epoch),
            memberVersion: toBN(params.memberVersion),
            headerBindingRoot: Array.from(params.headerBindingRoot),
            descriptorKind: params.descriptorKind,
            recipientMode: params.recipientMode,
            recipientEncoding: params.recipientEncoding,
            deltaOp: params.deltaOp,
            deltaSlot: params.deltaSlot,
            assignedUntilSlot: params.assignedUntilSlot,
            explicitCount: params.explicitCount,
            chainBreak: params.chainBreak,
            descriptorBytes: Buffer.from(params.descriptorBytes),
            headerBytes: Buffer.from(params.headerBytes),
        },
    ).accounts({
        signer: signer,
        sender: sender,
        permit: options?.permit ?? null,
    }).remainingAccounts(proofResult.metas.remainingAccounts)
        .instruction();

    return ix;
}
