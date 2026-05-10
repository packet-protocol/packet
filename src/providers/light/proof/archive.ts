import { PublicKey } from "@solana/web3.js";
import { type PackedAccounts, type Rpc } from "@lightprotocol/stateless.js";

import {
    finalizeLightProof,
    getNewAddressProof,
} from "./helpers";

export async function getInboxArchiveProof(args: {
    rpc: Rpc;
    programId: PublicKey;
    archive: PublicKey;
}) {

    const proof = await getNewAddressProof({
        rpc: args.rpc,
        programId: args.programId,
        addresses: [args.archive],
    });

    return finalizeLightProof({
        proof: proof.createAccountsProof,
        createAccountsProof: proof.createAccountsProof,
        packedAccounts: proof.packedAccounts,
        base: proof.base,
    });

}