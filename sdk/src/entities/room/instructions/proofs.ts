import { PublicKey } from "@solana/web3.js";
import { bn, type Rpc } from "@lightprotocol/stateless.js";
import * as anchor from "@anchor-lang/core";

import type { PacketProgram } from "../../../providers/program";
import {
    buildCompressedAccountMetaPacket,
    finalizeLightProof,
    getExistingAccountProof,
    getNewAddressProof,
    type CreateAccountsProofTs,
    type LightAccountMetas,
} from "../../../providers/light/proof/helpers";
import type { CompressedAccountMetaPacket } from "../../../providers/light/proof/types";

/**
 * Shared validity-proof builders for the room compressed flows.
 *
 * These reuse the established Light proof path (providers/light/proof/helpers,
 * same as the inbox archive / thread send flows): fetch the compressed account
 * via Photon, request a validity proof (`getValidityProofV0`), pack the Light
 * system + tree accounts via `PackedAccounts`, then finalize so the packed
 * indexes inside the proof params match the remaining accounts.
 *
 * The on-chain room instructions consume three proof shapes:
 * - `CompressedCreateAccountsProof`              → {@link getRoomCreateAccountsProof}
 * - `CompressedAccountsProof<T>` (update)        → {@link getRoomUpdateAccountProof}
 * - `CompressedAccountsProofOptionalUpdate<T>`   → {@link getRoomCreateOrUpdateAccountProof}
 */

/** `CompressedAccountUpdateInfo<T>` instruction-param shape. */
export type RoomCompressedUpdateInfo<T> = {
    treeInfo: CompressedAccountMetaPacket["treeInfo"];
    accountData: T;
};

/** `CompressedCreateAccountsProof` instruction-param shape. */
export type RoomCreateAccountsProofParam = CreateAccountsProofTs;

/** `CompressedAccountsProof<T>` instruction-param shape. */
export type RoomUpdateAccountsProofParam<T> = CreateAccountsProofTs & {
    update: RoomCompressedUpdateInfo<T>;
};

/** `CompressedAccountsProofOptionalUpdate<T>` instruction-param shape. */
export type RoomOptionalUpdateAccountsProofParam<T> = CreateAccountsProofTs & {
    update: RoomCompressedUpdateInfo<T> | null;
};

type CompressedAccount = NonNullable<Awaited<ReturnType<Rpc["getCompressedAccount"]>>>;

function isMissingAccountError(error: unknown): boolean {
    const anyError = error as any;

    if (anyError?.value === null) return true;

    const message = error instanceof Error ? error.message : String(error);

    return (
        message.includes("Expected an object, but received: null") ||
        message.includes("does not exist") ||
        message.includes("not found")
    );
}

/** Fetch a compressed account by derived address; null when it does not exist. */
export async function getRoomCompressedAccount(
    rpc: Rpc,
    address: PublicKey,
): Promise<CompressedAccount | null> {
    try {
        const account = await rpc.getCompressedAccount(bn(address.toBytes()));

        if (!account?.data) {
            return null;
        }

        return account;
    } catch (error) {
        if (isMissingAccountError(error)) {
            return null;
        }

        throw error;
    }
}

export function decodeRoomCompressedAccountData<T>(
    program: PacketProgram,
    typeName: string,
    data: Uint8Array | Buffer | string,
): T {
    const raw =
        typeof data === "string"
            ? Buffer.from(data, "base64")
            : Buffer.from(data);

    const coder = new anchor.BorshCoder(program.idl);

    return coder.types.decode(typeName, raw) as T;
}

export type RoomCreateAccountsProofResult = {
    createAccountsProof: RoomCreateAccountsProofParam;
    metas: LightAccountMetas;
};

/**
 * New-address-only proof (`CompressedCreateAccountsProof`), e.g. publish header.
 */
export async function getRoomCreateAccountsProof(args: {
    rpc: Rpc;
    programId: PublicKey;
    addresses: PublicKey[];
}): Promise<RoomCreateAccountsProofResult> {
    const proof = await getNewAddressProof({
        rpc: args.rpc,
        programId: args.programId,
        addresses: args.addresses,
    });

    const finalized = finalizeLightProof({
        createAccountsProof: proof.createAccountsProof,
        packedAccounts: proof.packedAccounts,
        base: proof.base,
    });

    return {
        createAccountsProof: finalized.createAccountsProof,
        metas: finalized.metas,
    };
}

export type RoomUpdateAccountProofResult<T> = {
    address: PublicKey;
    compressedAccount: CompressedAccount;
    currentData: T;
    proof: RoomUpdateAccountsProofParam<T>;
    metas: LightAccountMetas;
};

/**
 * Existing-account proof (`CompressedAccountsProof<T>`), optionally proving
 * new addresses in the same proof (e.g. member update + new message account).
 */
export async function getRoomUpdateAccountProof<T>(args: {
    rpc: Rpc;
    program: PacketProgram;
    address: PublicKey;
    typeName: string;
    newAddresses?: PublicKey[];
    label?: string;
}): Promise<RoomUpdateAccountProofResult<T>> {
    const account = await getRoomCompressedAccount(args.rpc, args.address);

    if (!account) {
        throw new Error(
            `${args.label ?? args.typeName} compressed account does not exist: ${args.address.toBase58()}`,
        );
    }

    const currentData = decodeRoomCompressedAccountData<T>(
        args.program,
        args.typeName,
        account.data!.data,
    );

    const proof = await getExistingAccountProof({
        rpc: args.rpc,
        programId: args.program.programId,
        account,
        newAddresses: args.newAddresses,
    });

    const accountMetaPacket = buildCompressedAccountMetaPacket({
        base: proof.base,
        account,
        rootIndex: proof.accountRootIndex,
        proveByIndex: proof.accountProveByIndex,
    });

    const finalized = finalizeLightProof({
        createAccountsProof: proof.createAccountsProof,
        packedAccounts: proof.packedAccounts,
        base: proof.base,
    });

    return {
        address: args.address,
        compressedAccount: account,
        currentData,
        proof: {
            ...finalized.createAccountsProof,
            update: {
                treeInfo: accountMetaPacket.treeInfo,
                accountData: currentData,
            },
        },
        metas: finalized.metas,
    };
}

export type RoomCreateOrUpdateAccountProofResult<T> = {
    address: PublicKey;
    exists: boolean;
    compressedAccount: CompressedAccount | null;
    currentData: T | null;
    proof: RoomOptionalUpdateAccountsProofParam<T>;
    metas: LightAccountMetas;
};

/**
 * Create-or-update proof (`CompressedAccountsProofOptionalUpdate<T>`):
 * - account missing → new-address proof, `update = null`;
 * - account present → existing-account proof, `update = { treeInfo, accountData }`.
 */
export async function getRoomCreateOrUpdateAccountProof<T>(args: {
    rpc: Rpc;
    program: PacketProgram;
    address: PublicKey;
    typeName: string;
    label?: string;
}): Promise<RoomCreateOrUpdateAccountProofResult<T>> {
    const account = await getRoomCompressedAccount(args.rpc, args.address);

    if (!account) {
        const created = await getRoomCreateAccountsProof({
            rpc: args.rpc,
            programId: args.program.programId,
            addresses: [args.address],
        });

        return {
            address: args.address,
            exists: false,
            compressedAccount: null,
            currentData: null,
            proof: {
                ...created.createAccountsProof,
                update: null,
            },
            metas: created.metas,
        };
    }

    const updated = await getRoomUpdateAccountProof<T>({
        rpc: args.rpc,
        program: args.program,
        address: args.address,
        typeName: args.typeName,
        label: args.label,
    });

    return {
        address: args.address,
        exists: true,
        compressedAccount: updated.compressedAccount,
        currentData: updated.currentData,
        proof: updated.proof,
        metas: updated.metas,
    };
}
