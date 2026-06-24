import { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program.js";
import { RoomReinitRootIx, type RoomReinitRootIxParams } from "../instructions/reinit-root.js";
import type { PipelineBase } from "../../../types/client.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";

export type RoomReinitRootPipelineResult = {
    pipeline: PipelineBase
}

export const RoomReinitRootPipeline = async (
    connection: Connection,
    signer: PublicKey,
    program: PacketProgram,
    params: RoomReinitRootIxParams,
    options?: PacketIxOptions & PacketTxOptions,
) => {

    let pipeline: Partial<PipelineBase> = {};
    let result: Partial<RoomReinitRootPipelineResult> = {};

    const ixs = await RoomReinitRootIx(connection, signer, program, params, options);

    pipeline.instruction = ixs;

    result.pipeline = pipeline as PipelineBase;

    return result as RoomReinitRootPipelineResult;
}
