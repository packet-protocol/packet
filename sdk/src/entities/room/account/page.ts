import { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import * as anchor from "@anchor-lang/core";

import type { PacketClient } from "../../../client.js";
import type { PacketProgram } from "../../../providers/program.js";
import { getMultipleCompressedAccountsByAddressChunked } from "../../../providers/light/compressed.js";
import { roomRecipientPageAddress } from "../utils/address.js";
import type { RoomRecipientPageAccountData, RoomRecipientPageData } from "../type/index.js";
import { getRoomCompressedAccount } from "../instructions/proofs.js";

export function DecodeRoomRecipientPageAccountData(
    program: PacketProgram,
    data: Uint8Array | Buffer | string,
): RoomRecipientPageAccountData {
    const raw =
        typeof data === "string"
            ? Buffer.from(data, "base64")
            : Buffer.from(data);

    const coder = new anchor.BorshCoder(program.idl);

    return coder.types.decode(
        "roomRecipientPage",
        raw,
    ) as RoomRecipientPageAccountData;
}

export const RoomRecipientPageAccountToRoomRecipientPage = (
    account: RoomRecipientPageAccountData,
    address: PublicKey,
): RoomRecipientPageData => {
    return {
        address,
        version: account.version,
        room: account.room,
        epoch: account.epoch,
        pageIndex: account.pageIndex,
        pagesTotal: account.pagesTotal,
        payloadHash: Uint8Array.from(account.payloadHash),
        payload: Uint8Array.from(account.payload),
    };
};

export const GetRoomRecipientPageAccount = async (
    client: PacketClient,
    room: PublicKey,
    era: BN | number,
    epoch: BN | number,
    pageIndex: number,
): Promise<RoomRecipientPageData | null> => {
    const address = roomRecipientPageAddress({
        room,
        era,
        epoch,
        pageIndex,
        programId: client.program.programId,
    });

    const account = await getRoomCompressedAccount(client.lightRpc, address);

    if (!account?.data) {
        return null;
    }

    const decoded = DecodeRoomRecipientPageAccountData(client.program, account.data.data);

    return RoomRecipientPageAccountToRoomRecipientPage(decoded, address);
};

/**
 * Batched fetch of all staged pages for an epoch (page indexes 0..pagesTotal-1).
 *
 * Returns one entry per page index, in index order; null entries mark missing
 * pages. Readers concatenate page payloads in index order to rebuild the
 * canonical checkpoint descriptor_bytes.
 */
export const GetRoomRecipientPages = async (
    client: PacketClient,
    room: PublicKey,
    era: BN | number,
    epoch: BN | number,
    pagesTotal: number,
    accountBatchSize?: number,
): Promise<(RoomRecipientPageData | null)[]> => {
    if (pagesTotal <= 0) {
        return [];
    }

    const addresses: PublicKey[] = [];

    for (let pageIndex = 0; pageIndex < pagesTotal; pageIndex++) {
        addresses.push(roomRecipientPageAddress({
            room,
            era,
            epoch,
            pageIndex,
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

        const decoded = DecodeRoomRecipientPageAccountData(client.program, account.data.data);

        return RoomRecipientPageAccountToRoomRecipientPage(decoded, addresses[index]);
    });
};
