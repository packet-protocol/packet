import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import type { Thread } from "../types";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../../../constants";
import { TokenProgramType } from "../../payment";

export const EscrowWithdrawIx = async (
    owner: PublicKey,
    program: PacketProgram,
    thread: Thread,
    receiverTokenAccount: PublicKey,
) => {

    const ix = await program.methods.withdrawEscrowPayment({
        inboxId: thread.inboxId,
        threadId: thread.id,
    }).accounts({
        signer: owner,
        owner: owner,
        permit: null,
        paymentMint: thread.escrowPayment!.mint,
        receiverTokenAccount: receiverTokenAccount,
        tokenProgram: thread.escrowPayment?.tokenProgram === TokenProgramType.TokenProgram ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID,
    }).instruction();

    return ix;

}