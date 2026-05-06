import { Connection, PublicKey } from "@solana/web3.js";
import {
    batchAddressTree,
    bn,
    deriveAddressV2,
    type Rpc,
} from "@lightprotocol/stateless.js";

export enum LightPdaStatus {
    Missing = "missing",
    Hot = "hot",
    Cold = "cold",
}

export type LightPdaNonHotStatus = Exclude<
    LightPdaStatus,
    LightPdaStatus.Hot
>;

type HotAccount = NonNullable<
    Awaited<ReturnType<Connection["getAccountInfo"]>>
>;

type BN254 = Parameters<Rpc["getMultipleCompressedAccounts"]>[0][number];

type CompressedAccountWithMerkleContext = Awaited<
    ReturnType<Rpc["getMultipleCompressedAccounts"]>
>[number];

export type LightPdaStatusResult = {
    status: LightPdaStatus;
    pda: PublicKey;
    compressedAddress: PublicKey;
    hotAccount: HotAccount | null;
    compressedAccount: CompressedAccountWithMerkleContext | null;
};

const ADDRESS_TREE = new PublicKey(batchAddressTree);

const deriveCompressedAddress = (
    pda: PublicKey,
    programId: PublicKey,
): PublicKey => deriveAddressV2(pda.toBytes(), ADDRESS_TREE, programId);

const toBn254 = (publicKey: PublicKey): BN254 =>
    bn(publicKey.toBytes()) as BN254;

const chunk = <T,>(items: readonly T[], size: number): T[][] => {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }

    return chunks;
};

const getMultipleAccountsInfoChunked = async (
    connection: Connection,
    publicKeys: readonly PublicKey[],
    batchSize: number
): Promise<Array<HotAccount | null>> => {
    const chunks = chunk(publicKeys, batchSize);

    const results = await Promise.all(
        chunks.map((publicKeyChunk) =>
            connection.getMultipleAccountsInfo(publicKeyChunk),
        ),
    );

    return results.flat();
};

const getMultipleCompressedAccountsChunked = async (
    rpc: Rpc,
    hashes: readonly BN254[],
    batchSize: number,
): Promise<CompressedAccountWithMerkleContext[]> => {
    if (hashes.length === 0) return [];

    const chunks = chunk(hashes, batchSize);

    const results = await Promise.all(
        chunks.map((hashChunk) =>
            rpc.getMultipleCompressedAccounts(hashChunk),
        ),
    );

    return results.flat();
};

const getCompressedAccountAddressKey = (
    compressedAccount: CompressedAccountWithMerkleContext,
): string | null => {
    if (!compressedAccount.address) return null;
    if (compressedAccount.address.length !== 32) return null;

    return new PublicKey(compressedAccount.address).toBase58();
};

const makeResult = (params: {
    status: LightPdaStatus;
    pda: PublicKey;
    compressedAddress: PublicKey;
    hotAccount?: HotAccount | null;
    compressedAccount?: CompressedAccountWithMerkleContext | null;
}): LightPdaStatusResult => ({
    status: params.status,
    pda: params.pda,
    compressedAddress: params.compressedAddress,
    hotAccount: params.hotAccount ?? null,
    compressedAccount: params.compressedAccount ?? null,
});

export async function getLightPdaStatus(params: {
    connection: Connection;
    rpc: Rpc;
    programId: PublicKey;
    pda: PublicKey;
}): Promise<LightPdaStatusResult> {
    const { connection, rpc, programId, pda } = params;

    const compressedAddress = deriveCompressedAddress(pda, programId);
    const hotAccount = await connection.getAccountInfo(pda);

    if (hotAccount) {
        return makeResult({
            status: LightPdaStatus.Hot,
            pda,
            compressedAddress,
            hotAccount,
        });
    }

    const compressedAccount = await rpc.getCompressedAccount(
        toBn254(compressedAddress),
    );

    if (compressedAccount) {
        return makeResult({
            status: LightPdaStatus.Cold,
            pda,
            compressedAddress,
            compressedAccount,
        });
    }

    return makeResult({
        status: LightPdaStatus.Missing,
        pda,
        compressedAddress,
    });
}

export async function getLightPdaStatusMultiple(params: {
    connection: Connection;
    rpc: Rpc;
    programId: PublicKey;
    pdas: PublicKey[];
    /**
     * Batch size for fetching accounts
     */
    accountBatchSize?: number;
}): Promise<Record<string, LightPdaStatusResult>> {
    const {
        connection,
        rpc,
        programId,
        pdas,
        accountBatchSize = 100,
    } = params;

    if (pdas.length === 0) return {};

    const uniquePdas = Array.from(
        new Map(pdas.map((pda) => [pda.toBase58(), pda])).values(),
    );

    const candidates = uniquePdas.map((pda) => {
        const pdaKey = pda.toBase58();
        const compressedAddress = deriveCompressedAddress(pda, programId);
        const compressedAddressKey = compressedAddress.toBase58();

        return {
            pda,
            pdaKey,
            compressedAddress,
            compressedAddressKey,
            compressedAddressHash: toBn254(compressedAddress),
        };
    });

    const hotAccounts = await getMultipleAccountsInfoChunked(
        connection,
        candidates.map((candidate) => candidate.pda),
        accountBatchSize,
    );

    const results: Record<string, LightPdaStatusResult> = {};
    const coldCandidates: typeof candidates = [];

    for (let index = 0; index < candidates.length; index++) {
        const candidate = candidates[index];
        const hotAccount = hotAccounts[index];

        if (hotAccount) {
            results[candidate.pdaKey] = makeResult({
                status: LightPdaStatus.Hot,
                pda: candidate.pda,
                compressedAddress: candidate.compressedAddress,
                hotAccount,
            });

            continue;
        }

        coldCandidates.push(candidate);
    }

    const coldCandidateByCompressedAddress = new Map(
        coldCandidates.map((candidate) => [
            candidate.compressedAddressKey,
            candidate,
        ]),
    );

    const compressedAccounts = await getMultipleCompressedAccountsChunked(
        rpc,
        coldCandidates.map((candidate) => candidate.compressedAddressHash),
        accountBatchSize,
    );

    for (const compressedAccount of compressedAccounts) {
        const compressedAddressKey =
            getCompressedAccountAddressKey(compressedAccount);

        if (!compressedAddressKey) continue;

        const candidate =
            coldCandidateByCompressedAddress.get(compressedAddressKey);

        if (!candidate) continue;

        results[candidate.pdaKey] = makeResult({
            status: LightPdaStatus.Cold,
            pda: candidate.pda,
            compressedAddress: candidate.compressedAddress,
            compressedAccount,
        });
    }

    for (const candidate of coldCandidates) {
        if (results[candidate.pdaKey]) continue;

        results[candidate.pdaKey] = makeResult({
            status: LightPdaStatus.Missing,
            pda: candidate.pda,
            compressedAddress: candidate.compressedAddress,
        });
    }

    return results;
}