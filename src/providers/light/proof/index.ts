import { PublicKey } from "@solana/web3.js";
import {
    deriveAddressV2,
    type PackedAccounts,
    type Rpc,
} from "@lightprotocol/stateless.js";

import {
    createLightProofBase,
    makeCreateAccountsProof,
    type CreateAccountsProofTs,
} from "./helpers";

export * from "./create-thread"
export * from "./send-message"
export * from "./helpers"


export type CreateProofResult = {
    proof: CreateAccountsProofTs;
    packedAccounts: PackedAccounts;
};

export async function getCompressedPdaProof(args: {
    rpc: Rpc;
    programId: PublicKey;
    pda: PublicKey;
    cpiContext?: boolean;
}): Promise<CreateProofResult> {
    const base = await createLightProofBase(args.rpc, args.programId, {
        cpiContext: args.cpiContext ?? false,
    });

    const proof = await makeCreateAccountsProof({
        rpc: args.rpc,
        base,
        addresses: [
            args.pda
        ],
    });

    return {
        proof,
        packedAccounts: base.packedAccounts,
    };
}