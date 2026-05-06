import type * as anchor from "@coral-xyz/anchor";
import type { TransactionInstruction } from "@solana/web3.js";
import type { PacketWallet } from "../entities/wallet";

export type PacketClientConfig = {
    wallet?: PacketWallet;

    connection: anchor.web3.Connection | string;

    photonRpc?: {
        connection?: anchor.web3.Connection | string;
        compressionApiEndpoint?: string;
        proverEndpoint?: string;
    };
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