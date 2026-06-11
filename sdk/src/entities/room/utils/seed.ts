import { sha256 } from "@noble/hashes/sha2";
import { hkdf } from "@noble/hashes/hkdf";
import { PublicKey } from "@solana/web3.js";
import { normalizeWalletAddress, type PacketSignMessage } from "../../../crypto/packet/seed";
import type { Bytes } from "../../../types";
import { utf8 } from "../../../utils/encoding";
import { bytesToHex } from "../../../utils/bytes";

export type DerivePacketRoomAdminSeedInput = {
    roomId: Bytes;
    adminAddress: PublicKey | string;
    signMessage: PacketSignMessage;

    origin?: string;
};

export type DerivedPacketRoomAdminSeed = {
    roomId: Bytes;
    roomTag: string;
    signingMessageText: string;
    signingMessageBytes: Bytes;
    signatureHash: Bytes;
    seed: Bytes;
};

export async function derivePacketRoomAdminSeed(input: DerivePacketRoomAdminSeedInput): Promise<DerivedPacketRoomAdminSeed> {
    const adminAddress = normalizeWalletAddress(input.adminAddress);

    const roomTag = deriveRoomTag(input.roomId);

    const signingMessageText = buildPacketRoomAdminSeedSigningMessage({
        adminAddress,
        roomTag: roomTag,
        roomId: input.roomId,
        origin: input.origin ?? "packet",
    });

    const signingMessageBytes = utf8(signingMessageText);
    const signature = await input.signMessage(signingMessageBytes);
    const signatureHash = sha256(signature);
    
    const seed = hkdf(
        sha256,
        signatureHash,
        utf8(`packet:roomadminseed:${roomTag}`),
        utf8("secret"),
        32,
    );

    return {
        roomId: input.roomId,
        roomTag: roomTag,
        signingMessageText,
        signingMessageBytes,
        signatureHash,
        seed,
    };
}

function buildPacketRoomAdminSeedSigningMessage(input: {
    adminAddress: PublicKey | string;
    roomTag: string;
    roomId: Bytes;
    origin?: string;
}): string {
    const adminAddress = normalizeWalletAddress(input.adminAddress);

    return [
        "packet derive admin room v1",
        `admin: ${adminAddress}`,
        `origin: ${input.origin ?? "packet"}`,
        `roomTag: ${input.roomTag}`,
        `purpose: derive admin encryption key for room ${bytesToHex(input.roomId)}`,
    ].join("\n");
}

function deriveRoomTag(roomId: Bytes): string {
    const tag = hkdf(
        sha256,
        roomId,
        utf8("packet:roomtag:v1"),
        utf8("secret"),
        8,
    );

    return bytesToHex(tag);
}