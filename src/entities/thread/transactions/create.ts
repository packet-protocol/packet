import { Rpc } from "@lightprotocol/stateless.js";
import { AddressLookupTableAccount, Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { CreateThreadPipeline } from "../pipeline/create";
import type { CreateMessageInputAndAccountsParams } from "../../message/instructions/resolve";
import { HandleTxPipeline } from "../../../utils/pipeline";

export const CreateThreadTx = async (
    connection: Connection,
    rpc: Rpc,
    sender: PublicKey,
    program: PacketProgram,
    params: CreateMessageInputAndAccountsParams,
    lookupTables: AddressLookupTableAccount[] | undefined = [],
    priorityFee: number = 1000,
) => {

    let computeUnits = 500_000;

    // pipeline
    const { pipeline } = await CreateThreadPipeline(
        connection,
        rpc,
        sender,
        program,
        params
    );

    // main tx
    const txs = await HandleTxPipeline(pipeline, {
        connection,
        payer: sender,
        computeUnits,
        priorityFee,
        lookupTables
    });

    return txs;
}