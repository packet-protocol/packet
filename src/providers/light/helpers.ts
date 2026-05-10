import * as anchor from "@coral-xyz/anchor";
import { bn, Rpc } from "@lightprotocol/stateless.js";
import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../program";

export async function fetchCompressedType<T = any>(args: {
    rpc: Rpc;
    program: PacketProgram;
    address: PublicKey;
    typeName: string;
}): Promise<T | null> {
    const account = await args.rpc.getCompressedAccount(bn(args.address.toBytes()));
    if (!account?.data?.data) return null;
    const coder = new anchor.BorshCoder(args.program.idl);
    return coder.types.decode(args.typeName, account.data.data) as T;
}
