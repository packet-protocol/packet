import { PublicKey } from "@solana/web3.js";
import {
    deriveAddressSeedV2,
    deriveAddressV2,
    type PackedAccounts,
    type Rpc,
} from "@lightprotocol/stateless.js";

import { u32Le } from "../../../utils/bytes";
import {
    createLightProofBase,
    makeCreateAccountsProof,
    type CreateAccountsProofTs,
} from "./helpers";
import { SEEDS } from "../../../constants";

export type CreateThreadAtomicProofResult = {
    createAccountsProof: CreateAccountsProofTs;
    packedAccounts: PackedAccounts;
};

export async function getCreateThreadAtomicProof(args: {
    rpc: Rpc;
    programId: PublicKey;
    threadPda: PublicKey;
    threadId: number;
    messageSeq: number;
}): Promise<CreateThreadAtomicProofResult> {
    const base = await createLightProofBase(args.rpc, args.programId, {cpiContext: true});

    const threadLightAddress = deriveAddressV2(
        args.threadPda.toBytes(),
        base.addressTree,
        args.programId,
    );

    const messageSeed = deriveAddressSeedV2([
        Buffer.from(SEEDS.message),
        u32Le(args.threadId),
        u32Le(args.messageSeq),
    ]);

    const messageAddress = deriveAddressV2(
        messageSeed,
        base.addressTree,
        args.programId,
    );

    const createAccountsProof = await makeCreateAccountsProof({
        rpc: args.rpc,
        base,
        addresses: [
            threadLightAddress,
            messageAddress,
        ],
    });

    return {
        createAccountsProof,
        packedAccounts: base.packedAccounts,
    };
}