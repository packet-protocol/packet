import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import * as Pda from "../../../pda";
import { type Rpc } from "@lightprotocol/stateless.js";
import { getCreateAccountsProofForPda } from "../../../providers/light/light-pda/create";

export const CreateActivityIx = async (
    rpc: Rpc,
    signer: PublicKey,
    owner: PublicKey,
    program: PacketProgram,
) => {

    const activity = Pda.activityPda(owner);

    const { createAccountsProof, packedAccounts } =
        await getCreateAccountsProofForPda(
            rpc,
            program.programId,
            activity,
        );


    const ix = program.methods.createActivity({
        createAccountsProof,
    }).accounts({
        feePayer: signer,
        owner: owner,
        compressionConfig: Pda.compressionConfigPda,
        pdaRentSponsor: Pda.rentSponsorPda,
    }).remainingAccounts(packedAccounts.toAccountMetas().remainingAccounts)
        .instruction();

    return ix;
}