import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export interface Payment {
    amount: BN,
    mint: PublicKey,
    /**
     * The `token account` address. **Not** the `owner` address.
     */
    to: PublicKey,
}

export interface Escrow {
    releaseSeconds: BN
}

export enum TokenProgramType {
    TokenProgram = "TokenProgram",
    Token2022Program = "Token2022Program"
}

export interface PaymentRule {
    inner: Payment,
    escrow: Escrow | null,
    tokenProgram: TokenProgramType
}