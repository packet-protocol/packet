import type { Connection } from "@solana/web3.js";
import { fetchAddressLookupTable, PACKET_LOOK_UP_TABLE_DEVNET } from "xpkt-sdk";

export async function txOptions(options: any, connection: Connection) {
  return {
    options: {
      sendOptions: { skipPreflight: options.skipPreflight ?? false },
    },
    priorityFee: options.priorityFee ? Number(options.priorityFee) : undefined,
    lookupTables: await fetchAddressLookupTable(connection, PACKET_LOOK_UP_TABLE_DEVNET)
  };
}