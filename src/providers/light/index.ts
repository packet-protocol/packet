import * as anchor from "@coral-xyz/anchor";
import { createRpc, Rpc } from "@lightprotocol/stateless.js";
import type { PacketClientConfig } from "../../types/client";

export * from "./proof"

export function makeLightRpc(connection: anchor.web3.Connection | string, config?: PacketClientConfig["photonRpc"]): Rpc {

    const commitment = config?.connection ? (typeof config.connection === "string" ? "confirmed" : config.connection.commitment || "confirmed") : typeof connection === "string" ? "confirmed" : connection.commitment;
    const rpcEndpoint = typeof connection === "string" ? connection : connection.rpcEndpoint;
    const compressionApiEndpoint = config?.compressionApiEndpoint ?? rpcEndpoint;
    const proverEndpoint = config?.proverEndpoint ?? rpcEndpoint;

    return createRpc(config?.connection ?? connection, compressionApiEndpoint, proverEndpoint, {
        commitment: commitment,
    });
}

