import { Rpc } from "@lightprotocol/stateless.js";
import { AddressLookupTableAccount, Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { CreateThreadPipeline } from "../pipeline/create";
import type { CreateMessageInputAndAccountsParams } from "../../message/instructions/resolve";
import { HandleTxPipeline } from "../../../utils/pipeline";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";

export const CreateThreadTx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateMessageInputAndAccountsParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let computeUnits = 500_000;

    // pipeline
    const { pipeline } = await CreateThreadPipeline(
        connection,
        rpc,
        signer,
        program,
        params,
        options
    );

    // main tx
    const txs = await HandleTxPipeline(pipeline, {
        connection,
        payer: signer,
        computeUnits,
        priorityFee: options?.priorityFee,
        lookupTables: options?.lookupTables
    });

    return txs;
}