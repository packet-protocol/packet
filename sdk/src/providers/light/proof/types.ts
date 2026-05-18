import * as anchor from "@coral-xyz/anchor";
import type { PacketIDL } from "../../../idl/packet.idl";

export type CompressedAccountMetaPacket =
    anchor.IdlTypes<PacketIDL>["compressedAccountMetaPacket"];

export type CompressedAccountMeta =
    CompressedAccountMetaPacket & {
        address: number[];
    };