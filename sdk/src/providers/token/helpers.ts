import type { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "../../constants.js";
import { associatedTokenAddress } from "../../pda.js";
import BN from "bn.js";

export const CheckIfAssociatedTokenAccountExists = async (
    connection: Connection,
    owner: PublicKey,
    mint: PublicKey,
    tokenProgram = TOKEN_PROGRAM_ID
): Promise<boolean> => {
    const address = associatedTokenAddress(mint, owner, tokenProgram);
    const ata = address;

    const accountInfo = await connection.getAccountInfo(ata);
    return accountInfo !== null;
}

export const GetTokenBalance = async (
    connection: Connection,
    address: PublicKey
): Promise<BN> => {
    try {
        const accountInfo = await connection.getTokenAccountBalance(address);
        return new BN(accountInfo?.value?.amount || "0");
    } catch {
        return new BN(0);
    }
}
