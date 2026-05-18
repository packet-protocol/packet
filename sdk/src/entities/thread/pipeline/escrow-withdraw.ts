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
import type { Rpc } from "@lightprotocol/stateless.js";
import type { PacketIxOptions } from "../../transaction/types";

export type CreateEscrowWithdrawPipelineResult = {
    pipeline: PipelineBase
}

export const CreateEscrowWithdrawPipeline = async (
    rpc: Rpc,
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    {
        thread,
        receiverTokenAccount,
    }: {

        thread: Thread,
        receiverTokenAccount?: PublicKey,
    },
    options?: PacketIxOptions,
) => {
    const sender = options?.owner ?? signer;

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
                signer,
                sender,
                thread.escrowPayment!.mint,
                tokenProgram
            );

            pipeline.preInstructions = [{
                instructions: [ix],
            }]
        }

        if (thread.escrowPayment!.mint.equals(WSOL_ID)) {
            additionalIxs.push(WSolCloseAccountIx(
                signer,
                sender,
                tokenAccount,
            ));
        }
    }

    // 2) withdraw
    const ix = await EscrowWithdrawIx(
        rpc,
        signer,
        program,
        thread,
        tokenAccount,
        options,
    );

    pipeline.instruction = [ix, ...additionalIxs];

    result.pipeline = pipeline as PipelineBase;

    return result as CreateEscrowWithdrawPipelineResult;
}