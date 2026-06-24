import * as anchor from "@anchor-lang/core";
import type { PacketIDL } from "../idl/packet.idl.js";
import {PACKET_IDL_JSON} from "../idl/packet.idl.json.js";
import type { PacketWallet } from "../entities/wallet/index.js";

/**
 * Create anchor provider
*/
export function makeAnchorProvider(
    connection: anchor.web3.Connection,
    packetWallet: PacketWallet,
): anchor.AnchorProvider {
    const wallet = packetWallet.toAnchorWallet();

    return new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());
}

export type PacketProgram = anchor.Program<PacketIDL>;

/**
 * Create Packet anchor program client
*/
export function makeProgram(provider: anchor.AnchorProvider, programId: anchor.web3.PublicKey): PacketProgram {
    const json = PACKET_IDL_JSON as PacketIDL;
    json.address = programId.toString();
    return new anchor.Program(json, provider);
}