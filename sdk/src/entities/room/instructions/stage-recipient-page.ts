import type { Connection, PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type BN from "bn.js";

import type { PacketProgram } from "../../../providers/program.js";
import type { PacketIxOptions } from "../../transaction/types.js";
import type { Bytes } from "../../../types/common.js";
import * as Pda from "../../../pda.js";
import { roomRecipientPageAddress } from "../utils/address.js";
import type { RoomRecipientPageAccountData } from "../type/index.js";
import { getRoomCreateOrUpdateAccountProof } from "./proofs.js";

export type RoomStageRecipientPageIxParams = {
    /* 32 byte */
    roomId: Bytes;

    /** Room generation (`room.era`). */
    era: BN | number;

    /**
     * Pending epoch the page belongs to (room.currentEpoch + 1).
     * Only used to derive the page compressed account address.
     */
    epoch: BN | number;

    pageIndex: number;
    pagesTotal: number;

    /** Byte chunk of the canonical checkpoint descriptor_bytes (<= 700 bytes, non-empty). */
    payload: Bytes;
}

export const RoomStageRecipientPageIx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomStageRecipientPageIxParams,
    options?: PacketIxOptions,
) => {
    const sender = options?.owner ?? signer;

    const room = Pda.roomPda(params.roomId, program.programId);

    const pageAddress = roomRecipientPageAddress({
        room,
        era: params.era,
        epoch: params.epoch,
        pageIndex: params.pageIndex,
        programId: program.programId,
    });

    // Pages are create-or-update while the publication is open (retry-friendly).
    const proofResult = await getRoomCreateOrUpdateAccountProof<RoomRecipientPageAccountData>({
        rpc,
        program,
        address: pageAddress,
        typeName: "roomRecipientPage",
        label: "RoomRecipientPage",
    });

    const ix = await program.methods.roomStageRecipientPage(
        Array.from(params.roomId),
        {
            proof: proofResult.proof,
            pageIndex: params.pageIndex,
            pagesTotal: params.pagesTotal,
            payload: Buffer.from(params.payload),
        },
    ).accounts({
        signer: signer,
        sender: sender,
        permit: options?.permit ?? null,
    }).remainingAccounts(proofResult.metas.remainingAccounts)
        .instruction();

    return ix;
}
