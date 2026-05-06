import * as anchor from "@coral-xyz/anchor";
import type { PacketIDL } from "../idl/packet.idl";
import PacketIDLJson from "../idl/packet.idl.json";
import type { PacketWallet } from "../entities/wallet";

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
export function makeProgram(provider: anchor.AnchorProvider): PacketProgram {
    return new anchor.Program(PacketIDLJson as PacketIDL, provider);
}