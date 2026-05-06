import { Rpc } from "@lightprotocol/stateless.js";
import { AddressLookupTableAccount, Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { SendMsgPipeline } from "../pipeline/send";
import type { CreateMessageInputAndAccountsParams } from "../instructions/resolve";
import { HandleTxPipeline } from "../../../utils/pipeline";

export const SendMsgTx = async (
    connection: Connection,
    rpc: Rpc,
    sender: PublicKey,
    program: PacketProgram,
    params: CreateMessageInputAndAccountsParams,
    lookupTables: AddressLookupTableAccount[] | undefined = [],
    priorityFee: number = 1000,
) => {

    let computeUnits = 300_000;

    // pipeline
    const { pipeline } = await SendMsgPipeline(
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