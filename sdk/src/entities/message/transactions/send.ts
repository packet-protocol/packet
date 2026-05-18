import { Rpc } from "@lightprotocol/stateless.js";
import { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { SendMsgPipeline } from "../pipeline/send";
import type { CreateMessageInputAndAccountsParams } from "../instructions/resolve";
import { HandleTxPipeline } from "../../../utils/pipeline";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";

export const SendMsgTx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: CreateMessageInputAndAccountsParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let computeUnits = 300_000;

    // pipeline
    const { pipeline } = await SendMsgPipeline(
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