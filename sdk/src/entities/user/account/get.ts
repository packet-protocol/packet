import type { PublicKey } from "@solana/web3.js";

import type { PacketProgram } from "../../../providers/program.js";
import * as Pda from "../../../pda.js";
import type { PacketUser } from "../types.js";

export function UserAccountToUser(
    address: PublicKey,
    account: Awaited<ReturnType<PacketProgram["account"]["user"]["fetch"]>>,
): PacketUser {
    return {
        address,
        owner: account.owner,
        name: account.name,
        uri: account.uri,
        agent: account.agent ?? null,
    };
}

export async function GetUserAccount(
    program: PacketProgram,
    ownerOrAddress: PublicKey,
    options: {
        isAddress?: boolean;
    } = {},
): Promise<PacketUser | null> {
    const address = options.isAddress
        ? ownerOrAddress
        : Pda.userPda(ownerOrAddress, program.programId);

    const account = await program.account.user.fetchNullable(address);

    if (!account) {
        return null;
    }

    return UserAccountToUser(address, account);
}