import { Connection, PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program.js";
import { RoomRemoveMemberIx, type RoomRemoveMemberIxParams } from "../instructions/remove-member.js";
import type { PipelineBase } from "../../../types/client.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";

export type RoomRemoveMemberPipelineResult = {
    pipeline: PipelineBase
}

export const RoomRemoveMemberPipeline = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomRemoveMemberIxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<RoomRemoveMemberPipelineResult> = {};

    const ix = await RoomRemoveMemberIx(connection, rpc, signer, program, params, options);

    pipeline.instruction = ix;

    result.pipeline = pipeline as PipelineBase;

    return result as RoomRemoveMemberPipelineResult;
}
