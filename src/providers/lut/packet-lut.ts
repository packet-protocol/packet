import {
    AddressLookupTableAccount,
    Connection,
    PublicKey,
} from "@solana/web3.js";

export async function fetchAddressLookupTable(
    connection: Connection,
    lookupTable: PublicKey | string | null | undefined,
): Promise<AddressLookupTableAccount[]> {
    if (!lookupTable) return [];

    const lutAddress =
        typeof lookupTable === "string"
            ? new PublicKey(lookupTable)
            : lookupTable;

    const res = await connection.getAddressLookupTable(lutAddress, {
        commitment: "confirmed",
    });

    if (!res.value) {
        throw new Error(`Address lookup table not found: ${lutAddress.toBase58()}`);
    }

    return [res.value];
}