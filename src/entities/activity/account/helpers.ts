import { type Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program";
import { PublicKey, type Connection } from "@solana/web3.js";
import * as Pda from "../../../pda";
import { getLightPdaStatus } from "../../../providers/light/light-pda/status";

export async function getActivityStatus(params: {
    connection: Connection;
    rpc: Rpc;
    owner: PublicKey;
    program: PacketProgram;
}) {
    const address = Pda.activityPda(params.owner);

    return getLightPdaStatus({
        connection: params.connection,
        rpc: params.rpc,
        programId: params.program.programId,
        pda: address,
    });
}
