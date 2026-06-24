import { PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import * as Pda from "../../../pda.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type { Inbox } from "../types.js";
import { getInboxArchiveProof } from "../../../providers/index.js";


export const ArchiveInboxIx = async (
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    inbox: Inbox,
    skipIfArchived: boolean = true,
) => {

    const archive = Pda.inboxArchivePda(inbox.address, inbox.index, program.programId);

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