import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import type { Thread } from "../types";
import * as Pda from "../../../pda";

export const EscrowApproveIx = async (
    sender: PublicKey,
    program: PacketProgram,
    thread: Thread,
) => {

    const ix = await program.methods.approveEscrow({
        threadId: thread.id,
    }).accounts({
        signer: sender,
        sender: sender,
        fromActivity: Pda.activityPda(thread.from),
        toActivity: Pda.activityPda(thread.to),
        permit: null,
    }).instruction();

    return ix;

}