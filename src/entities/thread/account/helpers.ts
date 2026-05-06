import { type Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program";
import { type Connection } from "@solana/web3.js";
import * as Pda from "../../../pda";
import { getLightPdaStatus } from "../../../providers/light/light-pda/status";

export async function getThreadStatus(params: {
    connection: Connection;
    rpc: Rpc;
    threadId: number;
    program: PacketProgram;
}) {
    const address = Pda.threadPda(params.threadId);

    return getLightPdaStatus({
        connection: params.connection,
        rpc: params.rpc,
        programId: params.program.programId,
        pda: address,
    });
}