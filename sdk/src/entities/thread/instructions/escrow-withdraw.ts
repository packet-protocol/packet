import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import type { Thread } from "../types.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../../../constants.js";
import { TokenProgramType } from "../../payment/index.js";
import { getThreadMutationProof } from "../../../providers/light/proof/thread.js";
import type { Rpc } from "@lightprotocol/stateless.js";
import type { PacketIxOptions } from "../../transaction/types.js";

export const EscrowWithdrawIx = async (
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    thread: Thread,
    receiverTokenAccount: PublicKey,
    options?: PacketIxOptions,
) => {
    const sender = options?.owner ?? signer;

    const proof = await getThreadMutationProof({
        rpc,
        program,
        threadId: thread.id,
    });

    const ix = await program.methods.withdrawEscrowPayment({
        proof: proof.createAccountsProof,
        threadAccountMeta: proof.threadAccountMetaPacket,
        currentThread: proof.currentThread,
    }).accounts({
        signer,
        owner: sender,
        permit: options?.permit ?? null,

        paymentMint: thread.escrowPayment!.mint,
        toTokenAccount: receiverTokenAccount,

        tokenProgram: thread.escrowPayment?.tokenProgram === TokenProgramType.TokenProgram ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID,
    })
    .remainingAccounts(proof.metas.remainingAccounts)
    .instruction();

    return ix;

}