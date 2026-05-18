import { bn, type BN254, type Rpc } from "@lightprotocol/stateless.js";
import type { PublicKey } from "@solana/web3.js";

type CompressedAccount = Awaited<ReturnType<Rpc["getCompressedAccount"]>>;

function isNullItemSuperstructError(error: unknown): boolean {
    const anyError = error as any;

    if (anyError?.value === null) return true;

    const message = error instanceof Error ? error.message : String(error);

    return (
        message.includes("Expected an object, but received: null") ||
        message.includes("value.items")
    );
}

export const getMultipleCompressedAccountsByAddressChunked = async (
    rpc: Rpc,
    addresses: readonly PublicKey[],
    batchSize: number,
): Promise<CompressedAccount[]> => {
    if (addresses.length === 0) return [];

    const chunks = chunk(addresses, batchSize);
    const results: CompressedAccount[] = [];

    for (const addressChunk of chunks) {
        const chunkResults = await Promise.all(
            addressChunk.map(async (address) => {
                try {
                    return await rpc.getCompressedAccount(
                        bn(address.toBytes()),
                    );
                } catch (error) {
                    if (isNullItemSuperstructError(error)) {
                        return null;
                    }

                    throw error;
                }
            }),
        );

        results.push(...chunkResults);
    }

    return results;
};

export const getMultipleCompressedAccountsChunked = async (
    rpc: Rpc,
    hashes: readonly BN254[],
    batchSize: number,
) => {
    if (hashes.length === 0) return [];

    const chunks = chunk(hashes, batchSize);

    const results = await Promise.all(
        chunks.map(async (hashChunk) => {
            try {
                return await rpc.getMultipleCompressedAccounts(hashChunk);
            } catch (error) {
                if (isNullItemSuperstructError(error)) {
                    return [];
                }

                throw error;
            }
        }),
    );

    return results.flat();
};

const chunk = <T,>(items: readonly T[], size: number): T[][] => {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }

    return chunks;
};