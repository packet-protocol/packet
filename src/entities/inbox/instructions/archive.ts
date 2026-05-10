import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import * as Pda from "../../../pda";
import { type Rpc } from "@lightprotocol/stateless.js";
import type { Inbox } from "../types";
import { getInboxArchiveProof } from "../../../providers";


export const ArchiveInboxIx = async (
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    inbox: Inbox,
    skipIfArchived: boolean = true,
) => {

    const archive = Pda.inboxArchivePda(inbox.address, inbox.index);

    const proofBundle = await getInboxArchiveProof({
        rpc,
        programId: program.programId,
        archive,
    });

    const ix = program.methods.archiveInbox({
        createAccountsProof: proofBundle.createAccountsProof,
        optional: skipIfArchived,
    }).accounts({
        signer: signer,
        inbox: inbox.address,
    }).remainingAccounts(proofBundle.metas.remainingAccounts)
        .instruction();

    return ix;
}