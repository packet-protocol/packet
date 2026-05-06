import * as anchor from "@coral-xyz/anchor";
import type { Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program";
import type { Connection, PublicKey } from "@solana/web3.js";
import { getLightPdaStatus, LightPdaStatus } from "../../../providers/light/light-pda/status";
import type { PacketIDL } from "../../../idl/packet.idl";

export const GetActivityAccount = async (
    connection: Connection,
    rpc: Rpc,
    program: PacketProgram,
    address: PublicKey
) => {

    const account = await getLightPdaStatus({
        connection,
        rpc,
        programId: program.programId,
        pda: address,
    });

    if (account.status === LightPdaStatus.Missing) {
        return null;
    }

    const coder = new anchor.BorshCoder(program.idl);

    let decoded: anchor.IdlAccounts<PacketIDL>["activity"];

    if (account.status === LightPdaStatus.Hot) {
        let data = Uint8Array.from(account.hotAccount!.data);
        decoded = coder.types.decode("activity", Buffer.from(data.slice(8)));
    } else {
        decoded = coder.types.decode("activity", account.compressedAccount!.data.data);
    }

    return {
        status: account.status,
        address: account.pda,
        compressedAddress: account.compressedAddress,
        data: decoded,
    }

}