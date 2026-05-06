import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import type { PipelineBase } from "../../../types/client";
import { EscrowWithdrawIx } from "../instructions/escrow-withdraw";
import type { Thread } from "../types";
import { associatedTokenAddress } from "../../../pda";
import { CheckIfAssociatedTokenAccountExists } from "../../../providers/token/helpers";
import { CreateAssociatedTokenAccountIx, WSolCloseAccountIx } from "../../../providers/token/instructions";
import { TokenProgramType } from "../../payment";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, WSOL_ID } from "../../../constants";

export type CreateEscrowWithdrawPipelineResult = {
    pipeline: PipelineBase
}

export const CreateEscrowWithdrawPipeline = async (
    connection: Connection,
    sender: PublicKey,
    program: PacketProgram,
    thread: Thread,
    receiverTokenAccount?: PublicKey,
) => {
    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<CreateEscrowWithdrawPipelineResult> = {};

    let tokenAccount = receiverTokenAccount;
    let additionalIxs: TransactionInstruction[] = [];

    const tokenProgram = thread.escrowPayment?.tokenProgram === TokenProgramType.TokenProgram ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;

    if (!tokenAccount) {
        tokenAccount = associatedTokenAddress(thread.escrowPayment!.mint, sender, tokenProgram)

        let exists = await CheckIfAssociatedTokenAccountExists(
            connection,
            sender,
            thread.escrowPayment!.mint,
            tokenProgram
        );

        if (!exists) {
            let ix = CreateAssociatedTokenAccountIx(
                sender,
                sender,
                thread.escrowPayment!.mint,
                tokenProgram
            );

            pipeline.preInstructions = [{
                instructions: [ix],
            }]
        }

        if (thread.escrowPayment!.mint.equals(WSOL_ID)){
            additionalIxs.push(WSolCloseAccountIx(
                sender,
                tokenAccount,
            ));
        }
    }

    // 2) withdraw
    const ix = await EscrowWithdrawIx(
        sender,
        program,
        thread,
        tokenAccount,
    );

    pipeline.instruction = [ix, ...additionalIxs];

    result.pipeline = pipeline as PipelineBase;

    return result as CreateEscrowWithdrawPipelineResult;
}