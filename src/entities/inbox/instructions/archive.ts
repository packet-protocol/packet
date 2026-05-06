import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import * as Pda from "../../../pda";
import { type Rpc } from "@lightprotocol/stateless.js";
import type { Inbox } from "../types";
import { getCompressedPdaProof } from "../../../providers/light";


export const ArchiveInboxIx = async (
    rpc: Rpc,
    owner: PublicKey,
    program: PacketProgram,
    inbox: Inbox,
    skipIfArchived: boolean = true,
) => {

    const archive = Pda.inboxArchivePda(inbox.address, inbox.index);

    const {proof, packedAccounts} = await getCompressedPdaProof({
        rpc,
        programId: program.programId,
        pda: archive,
    });


    const ix = program.methods.archiveInbox({
        createAccountsProof: proof,
        optional: skipIfArchived,
    }).accounts({
        signer: owner,
        owner: owner,
        permit: null,
        inbox: inbox.address,
    }).remainingAccounts(packedAccounts.toAccountMetas().remainingAccounts)
        .instruction();

    return ix;
}