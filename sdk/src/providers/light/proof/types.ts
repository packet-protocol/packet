import * as anchor from "@anchor-lang/core";
import type { PacketIDL } from "../../../idl/packet.idl";

export type CompressedAccountMetaPacket =
    anchor.IdlTypes<PacketIDL>["compressedAccountMetaPacket"];

export type CompressedAccountMeta =
    CompressedAccountMetaPacket & {
        address: number[];
    };