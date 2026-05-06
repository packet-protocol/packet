import type { PackedAccounts, Rpc } from "@lightprotocol/stateless.js"
import { PublicKey } from "@solana/web3.js"
import type { PacketProgram } from "../../../providers/program"
import { SEEDS } from "../../../constants";
import { createLoadCompressedPdaIx } from "../../../providers/light/light-pda/load";
import { u32Le } from "../../../utils/bytes";

export const CreateLoadThreadCompressedIx = async (
    rpc: Rpc,
    signer: PublicKey,
    program: PacketProgram,
    threadId: number,
) => {

    const seeds = [Buffer.from(SEEDS.thread), u32Le(threadId)];
    const [pda, bump] = PublicKey.findProgramAddressSync(
        seeds,
        program.programId,
    );

    const packedName = "PackedThread";
    const name = "thread";

    const variantSeedsDerive = (packedAccounts: PackedAccounts) => {
        return {
            seeds: {
                threadId: u32Le(threadId),
                bump
            },
            packedAccounts,
        }
    }

    const ix = await createLoadCompressedPdaIx(
        rpc,
        signer,
        program,
        pda,
        packedName,
        name,
        variantSeedsDerive,
    );

    return ix
}