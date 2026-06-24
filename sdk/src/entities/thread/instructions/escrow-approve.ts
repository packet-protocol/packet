import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import type { Thread } from "../types.js";
import { getThreadMutationProof } from "../../../providers/light/proof/thread.js";
import type { Rpc } from "@lightprotocol/stateless.js";
import type { PacketIxOptions } from "../../transaction/types.js";

export const EscrowApproveIx = async (
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    thread: Thread,
    options?: PacketIxOptions,
) => {

    const sender = options?.owner ?? signer;

    const proof = await getThreadMutationProof({
        rpc,
        program,
        threadId: thread.id,
    });

    const ix = await program.methods.approveEscrow({
        proof: proof.createAccountsProof,
        threadAccountMeta: proof.threadAccountMetaPacket,
        currentThread: proof.currentThread,
    }).accounts({
        signer,
        owner: sender,
        permit: options?.permit ?? null,
    })
    .remainingAccounts(proof.metas.remainingAccounts)
    .instruction();

    return ix;

}