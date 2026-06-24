import { Connection, PublicKey } from "@solana/web3.js";
import { type Rpc } from "@lightprotocol/stateless.js";
import type { PacketProgram } from "../../../providers/program.js";
import { RoomAddMemberIx, type RoomAddMemberIxParams } from "../instructions/add-member.js";
import type { PipelineBase } from "../../../types/client.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";

export type RoomAddMemberPipelineResult = {
    pipeline: PipelineBase
}

export const RoomAddMemberPipeline = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomAddMemberIxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<RoomAddMemberPipelineResult> = {};

    const ix = await RoomAddMemberIx(connection, rpc, signer, program, params, options);

    pipeline.instruction = ix;

    result.pipeline = pipeline as PipelineBase;

    return result as RoomAddMemberPipelineResult;
}
