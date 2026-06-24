import type { AddressLookupTableAccount, PublicKey } from "@solana/web3.js";
import type { SubmitAndConfirmOptions } from "./client.js";

export type PacketTxOptions = {
    /**
     * priority fee in micro lamports
     */
    priorityFee?: number,
    /**
     * options for submitting and confirming the transaction
     */
    options?: SubmitAndConfirmOptions,

    /**
     * override the default lookup tables used for the transaction
     */
    lookupTables?: AddressLookupTableAccount[]
}

export type PacketIxOptions = {
    /**
     * permit account for the transaction (if the tx done for someone else that signer have permit)
     */
    permit?: PublicKey,
    /**
     * owner/sender account in ix if exists
     */
    owner?: PublicKey,
}

export type WithTxOptions<T> = T & {
    options?: PacketIxOptions & PacketTxOptions;
}