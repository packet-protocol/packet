import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
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

export type SendMessageProofResult = {
    createAccountsProof: CreateAccountsProofTs;
    createAccountsProofWithArchive: CreateAccountsProofTs | null;
    packedAccounts: PackedAccounts;
    debug: {
        messageAddress: PublicKey;
        archiveAddress: PublicKey | null;
    };
};

export async function getSendMessageProof(args: {
    rpc: Rpc;
    programId: PublicKey;
    threadId: number;
    messageSeq: number;
    archive?: {
        inbox: PublicKey;
        index: BN;
    } | null;
}): Promise<SendMessageProofResult> {
    const base = await createLightProofBase(args.rpc, args.programId, {cpiContext: false});

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

    let archiveAddress: PublicKey | null = null;

    if (args.archive) {
        const archiveSeed = deriveAddressSeedV2([
            Buffer.from(SEEDS.inboxArchive),
            args.archive.inbox.toBytes(),
            args.archive.index.toArrayLike(Buffer, "le", 8),
        ]);

        archiveAddress = deriveAddressV2(
            archiveSeed,
            base.addressTree,
            args.programId,
        );
    }

    const createAccountsProof = await makeCreateAccountsProof({
        rpc: args.rpc,
        base,
        addresses: [messageAddress],
    });

    const createAccountsProofWithArchive = archiveAddress
        ? await makeCreateAccountsProof({
            rpc: args.rpc,
            base,
            addresses: [messageAddress, archiveAddress],
        })
        : null;

    return {
        createAccountsProof,
        createAccountsProofWithArchive,
        packedAccounts: base.packedAccounts,
        debug: {
            messageAddress,
            archiveAddress,
        },
    };
}