import type * as anchor from "@anchor-lang/core";
import type { TransactionInstruction } from "@solana/web3.js";
import type { PacketWallet } from "../entities/wallet";
import type { PacketTxOptions } from "../entities/transaction/types";

export type PacketClientConfig = {
    wallet?: PacketWallet;

    connection: anchor.web3.Connection | string;

    photonRpc?: {
        connection?: anchor.web3.Connection | string;
        compressionApiEndpoint?: string;
        proverEndpoint?: string;
    };

    defaultTxOptions?: PacketTxOptions;

    /** Optional lookup table address override. Defaults to known addresses for mainnet and devnet.*/
    lookUpTableAddress?: anchor.web3.PublicKey;

    cluster?: "mainnet" | "devnet";
    /** Defaults to [`constants.PACKET_PROGRAM_ID`] */
    programId?: anchor.web3.PublicKey;
};


export type PhotonRpcConfig = NonNullable<PacketClientConfig["photonRpc"]>;
export interface TxReceiptWithClient<T> {
    receipt: string[];
    client: T;
}

export interface PipelineBase {
    instruction: TransactionInstruction | TransactionInstruction[];
    preInstructions?: PipelineIxs[]
}

export type PipelineIxs = {
    instructions: TransactionInstruction[];
    isTxGroup?: boolean; // if true, these instructions should be grouped into a separate transaction
    computeUnits?: number; //recommended compute units for the pre instruction transaction 
}