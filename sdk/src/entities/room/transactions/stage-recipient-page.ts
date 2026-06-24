import { type Connection, type PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program.js";
import { type RoomStageRecipientPageIxParams } from "../instructions/stage-recipient-page.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { HandleTxPipeline } from "../../../index.js";
import { RoomStageRecipientPagePipeline } from "../pipeline/stage-recipient-page.js";

export const RoomStageRecipientPageTx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomStageRecipientPageIxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let computeUnits = 400_000;

    // pipeline
    const { pipeline } = await RoomStageRecipientPagePipeline(
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
