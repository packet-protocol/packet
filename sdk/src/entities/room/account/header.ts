import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import * as anchor from "@anchor-lang/core";

import type { PacketClient } from "../../../client.js";
import type { PacketProgram } from "../../../providers/program.js";
import { getMultipleCompressedAccountsByAddressChunked } from "../../../providers/light/compressed.js";
import { toBN } from "../../../utils/bytes.js";
import { roomHeaderAddress } from "../utils/address.js";
import type { RoomEpochHeaderAccountData, RoomEpochHeaderData } from "../type/index.js";
import { getRoomCompressedAccount } from "../instructions/proofs.js";

export function DecodeRoomHeaderAccountData(
    program: PacketProgram,
    data: Uint8Array | Buffer | string,
): RoomEpochHeaderAccountData {
    const raw =
        typeof data === "string"
            ? Buffer.from(data, "base64")
            : Buffer.from(data);

    const coder = new anchor.BorshCoder(program.idl);

    return coder.types.decode(
        "roomEpochHeader",
        raw,
    ) as RoomEpochHeaderAccountData;
}

export const RoomHeaderAccountToRoomEpochHeader = (
    account: RoomEpochHeaderAccountData,
    address: PublicKey,
): RoomEpochHeaderData => {
    return {
        address,
        version: account.version,
        room: account.room,
        epoch: account.epoch,
        memberVersion: account.memberVersion,
        headerBindingRoot: Uint8Array.from(account.headerBindingRoot),

        descriptorKind: account.descriptorKind,
        recipientMode: account.recipientMode,
        recipientEncoding: account.recipientEncoding,
        deltaOp: account.deltaOp,
        deltaSlot: account.deltaSlot,
        deltaDepth: account.deltaDepth,
        assignedUntilSlot: account.assignedUntilSlot,
        explicitCount: account.explicitCount,
        chainStartEpoch: account.chainStartEpoch,
        recipientStateRoot: Uint8Array.from(account.recipientStateRoot),
        headerHash: Uint8Array.from(account.headerHash),
        descriptorBytes: Uint8Array.from(account.descriptorBytes),
        headerBytes: Uint8Array.from(account.headerBytes),
    };
};

export const GetRoomHeaderAccount = async (
    client: PacketClient,
    room: PublicKey,
    era: BN | number,
    epoch: BN | number,
): Promise<RoomEpochHeaderData | null> => {
    const address = roomHeaderAddress({
        room,
        era,
        epoch,
        programId: client.program.programId,
    });

    const account = await getRoomCompressedAccount(client.lightRpc, address);

    if (!account?.data) {
        return null;
    }

    const decoded = DecodeRoomHeaderAccountData(client.program, account.data.data);

    return RoomHeaderAccountToRoomEpochHeader(decoded, address);
};

/**
 * Batched fetch of the headers for epochs [fromEpoch .. toEpoch] (inclusive).
 *
 * Returns one entry per epoch in ascending order; entries are null for epochs
 * whose header account does not exist (callers can detect gaps).
 */
export const GetRoomHeaderRange = async (
    client: PacketClient,
    room: PublicKey,
    era: BN | number,
    fromEpoch: BN | number,
    toEpoch: BN | number,
    accountBatchSize?: number,
): Promise<(RoomEpochHeaderData | null)[]> => {
    const from = toBN(fromEpoch);
    const to = toBN(toEpoch);

    if (to.lt(from)) {
        return [];
    }

    const count = to.sub(from).toNumber() + 1;

    const addresses: PublicKey[] = [];

    for (let i = 0; i < count; i++) {
        addresses.push(roomHeaderAddress({
            room,
            era,
            epoch: from.add(new BN(i)),
            programId: client.program.programId,
        }));
    }

    const accounts = await getMultipleCompressedAccountsByAddressChunked(
        client.lightRpc,
        addresses,
        accountBatchSize || 10,
    );

    return accounts.map((account, index) => {
        if (!account?.data) {
            return null;
        }

        const decoded = DecodeRoomHeaderAccountData(client.program, account.data.data);

        return RoomHeaderAccountToRoomEpochHeader(decoded, addresses[index]);
    });
};
