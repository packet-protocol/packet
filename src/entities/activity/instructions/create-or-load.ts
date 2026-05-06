import type { Rpc } from "@lightprotocol/stateless.js";
import type { Connection, PublicKey } from "@solana/web3.js";
import type { PacketProgram } from "../../../providers/program";
import { getActivityStatus } from "../account/helpers";
import { CreateActivityIx } from "./create";
import { LightPdaStatus } from "../../../providers/light/light-pda/status";
import { CreateLoadActivityCompressedIx } from "./load";
import * as Pda from "../../../pda";

export const CreateOrLoadActivityIfNeededIx = async (
    connection: Connection,
    rpc: Rpc,
    signer: PublicKey,
    owner: PublicKey,
    program: PacketProgram,
    status?: LightPdaStatus
) => {
    if (status === LightPdaStatus.Hot) {
        return {
            status: status,
            address: Pda.activityPda(owner)
        };
    } else {
        if (!status) {
            const { status: currentStatus, pda } = await getActivityStatus({
                connection,
                rpc,
                owner: owner,
                program,
            });

            status = currentStatus;

            if (status === LightPdaStatus.Missing) {
                return {
                    status: status,
                    instruction: await CreateActivityIx(rpc, signer, owner, program),
                    address: pda,
                }
            } else if (status === LightPdaStatus.Cold) {
                return {
                    status: status,
                    instruction: await CreateLoadActivityCompressedIx(rpc, signer, owner, program),
                    address: pda,
                }
            } else {
                return {
                    status: status,
                    address: pda,
                }
            }
            
        }
    }
}