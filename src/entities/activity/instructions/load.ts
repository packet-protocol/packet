import type { PackedAccounts, Rpc } from "@lightprotocol/stateless.js"
import { PublicKey } from "@solana/web3.js"
import type { PacketProgram } from "../../../providers/program"
import { SEEDS } from "../../../constants";
import { createLoadCompressedPdaIx } from "../../../providers/light/light-pda/load";

export const CreateLoadActivityCompressedIx = async (
    rpc: Rpc,
    signer: PublicKey,
    owner: PublicKey,
    program: PacketProgram,
) => {

    const seeds = [Buffer.from(SEEDS.activity), owner.toBuffer()];
    const [pda, bump] = PublicKey.findProgramAddressSync(
        seeds,
        program.programId,
    );

    const packedName = "PackedActivity";
    const name = "activity";

    const variantSeedsDerive = (packedAccounts: PackedAccounts) => {
        let ownerIdx = packedAccounts.insertOrGet(owner)

        return {
            seeds: {
                ownerIdx,
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