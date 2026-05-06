import { PublicKey } from "@solana/web3.js";
import { PACKET_PROGRAM_ID, SEEDS, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "./constants";
import { u32Le, u64Le } from "./utils/bytes.js";
import BN from "bn.js";
import { batchAddressTree, deriveAddressSeedV2, deriveAddressV2 } from "@lightprotocol/stateless.js";

export type PdaConfig = { programId?: PublicKey };

const pid = (programId?: PublicKey) => programId ?? PACKET_PROGRAM_ID;
const s = (seed: string) => Buffer.from(seed);

export function userPda(owner: PublicKey, programId?: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([s(SEEDS.user), owner.toBuffer()], pid(programId))[0];
}

export function inboxPda(id: BN, owner: PublicKey, programId?: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([s(SEEDS.inbox), u64Le(id), owner.toBuffer()], pid(programId))[0];
}

export function inboxBodyPda(inbox: PublicKey, programId?: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([s(SEEDS.inboxBody), inbox.toBuffer()], pid(programId))[0];
}

export function inboxArchivePda(inbox: PublicKey, index: BN, programId?: PublicKey): PublicKey {
  //return PublicKey.findProgramAddressSync([s(SEEDS.inboxArchive), inbox.toBuffer(), u64Le(index),], pid(programId))[0];
  const archiveSeed = deriveAddressSeedV2([
    Buffer.from(SEEDS.inboxArchive),
    inbox.toBuffer(),
    u64Le(index),
  ]);

  return deriveAddressV2(
    archiveSeed,
    new PublicKey(batchAddressTree),
    pid(programId),
  );
}

export function inboxMetadataPda(inbox: PublicKey, programId?: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([s(SEEDS.inboxMetadata), inbox.toBuffer()], pid(programId))[0];
}

export function threadPda(threadId: number, programId?: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([s(SEEDS.thread), u32Le(threadId)], pid(programId))[0];
}

export function messagePda(threadId: number, msgSeq: number, programId?: PublicKey): PublicKey {
  //return PublicKey.findProgramAddressSync([s(SEEDS.message), u32Le(threadId), u32Le(msgSeq)], pid(programId))[0];
  const messageSeed = deriveAddressSeedV2([
    Buffer.from(SEEDS.message),
    u32Le(threadId),
    u32Le(msgSeq),
  ]);

  return deriveAddressV2(
    messageSeed,
    new PublicKey(batchAddressTree),
    pid(programId),
  );
}

export function activityPda(owner: PublicKey, programId?: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([s(SEEDS.activity), owner.toBuffer()], pid(programId))[0];
}

export function vaultPda(programId?: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([s(SEEDS.vault)], pid(programId))[0];
}

export function keyPda(owner: PublicKey, programId?: PublicKey): PublicKey {
   const seed = deriveAddressSeedV2([
        Buffer.from(SEEDS.key),
        owner.toBytes(),
    ]);

    return deriveAddressV2(
        seed,
        new PublicKey(batchAddressTree),
        pid(programId),
    );
}

export function associatedTokenAddress(mint: PublicKey, owner: PublicKey, tokenProgram = TOKEN_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

export const rentSponsorPda = PublicKey.findProgramAddressSync([s("rent_sponsor")], pid())[0];
export const compressionConfigPda = PublicKey.findProgramAddressSync([s("compressible_config"), Buffer.from([0x00, 0x00])], pid())[0];

export const pdas = {
  user: userPda,
  inbox: inboxPda,
  inboxBody: inboxBodyPda,
  inboxMetadata: inboxMetadataPda,
  thread: threadPda,
  message: messagePda,
  activity: activityPda,
  vault: vaultPda,
  key: keyPda,
  ata: associatedTokenAddress,
  rentSponsor: rentSponsorPda,
  compressionConfig: compressionConfigPda,
};
