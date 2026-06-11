import type { Connection, PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type BN from "bn.js";

import type { PacketProgram } from "../../../providers/program";
import type { PacketIxOptions } from "../../transaction/types";
import type { Bytes } from "../../../types/common";
import { toBN } from "../../../utils/bytes";
import * as Pda from "../../../pda";
import { MessageType } from "../../message/types";
import { MessageTypeToAnchorEnum } from "../../message/utils/helpers";
import { roomMemberAddress, roomMessageAddress } from "../utils/address";
import type { RoomMemberAccountData } from "../type";
import { getRoomUpdateAccountProof } from "./proofs";

export type RoomSendMessageIxParams = {
    /* 32 byte */
    roomId: Bytes;

    /** 64 byte random client message id (compressed address seed). */
    clientMsgId: Bytes;

    message: {
        messageType: MessageType;
        /** Encrypted message payload. */
        content: Bytes;
        payment?: BN | null;
    };

    /**
     * The epoch the body was encrypted under. The program assigns
     * `crypto_epoch = room.current_epoch` at landing; if a header published
     * while this send was in flight the epochs diverge and the program rejects
     * with `SendEpochChanged` (6066) so the client can re-encrypt + retry.
     */
    expectedCryptoEpoch: BN | number;
}

export const RoomSendMessageIx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomSendMessageIxParams,
    options?: PacketIxOptions,
) => {
    const sender = options?.owner ?? signer;

    const room = Pda.roomPda(params.roomId, program.programId);

    // The program binds the member account to the sender via the seed-derived address.
    const memberAddress = roomMemberAddress({
        room,
        owner: sender,
        programId: program.programId,
    });

    const messageAddress = roomMessageAddress({
        room,
        clientMsgId: params.clientMsgId,
        programId: program.programId,
    });

    // Single proof: existing member account (update) + new message address.
    const proofResult = await getRoomUpdateAccountProof<RoomMemberAccountData>({
        rpc,
        program,
        address: memberAddress,
        typeName: "roomMember",
        newAddresses: [messageAddress],
        label: "RoomMember",
    });

    const ix = await program.methods.roomSendMessage(
        Array.from(params.roomId),
        {
            proof: proofResult.proof,
            message: {
                messageType: MessageTypeToAnchorEnum(params.message.messageType),
                content: Buffer.from(params.message.content),
                payment: params.message.payment ?? null,
            },
            messageId: Array.from(params.clientMsgId),
            expectedCryptoEpoch: toBN(params.expectedCryptoEpoch),
        },
    ).accounts({
        signer: signer,
        sender: sender,
        permit: options?.permit ?? null,
    }).remainingAccounts(proofResult.metas.remainingAccounts)
        .instruction();

    return ix;
}
