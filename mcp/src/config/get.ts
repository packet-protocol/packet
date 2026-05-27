import type { Keypair } from "@solana/web3.js";
import { decodeBase58Secret, loadKeypairFromFile } from "./keypair";
import type { InputConfig, PacketMcpConfig } from "./types";
import { DerivePacketWallet, DerivePacketClient } from "./client";
import type { PacketClientConfig } from "xpkt-sdk";

/**
 * Load the active Packet MCP configuration from environment variables.
 *
 * This function expects the following environment variables to be set:
 * - PACKET_RPC_URL: The RPC URL to connect to.
 * - PACKET_CLUSTER: The cluster to connect to (e.g. "mainnet", "devnet").
 * - Either PACKET_PRIVATE_KEY or PACKET_KEYPAIR_PATH must be set, but not both:
 *   - PACKET_PRIVATE_KEY: A base58-encoded secret key.
 *   - PACKET_KEYPAIR_PATH: A filesystem path to a JSON file containing the keypair.
 * - Optionally, the following can be set to override photon RPC endpoints (defaulting to PACKET_RPC_URL if not set):
 *   - PACKET_COMPRESSION_API_ENDPOINT
 *   - PACKET_PROVER_ENDPOINT
 *
 * If any required variables are missing or if there are issues loading the keypair,
 * this function will throw an error with a descriptive message.
 *
 * @returns A PacketMcpConfig object containing the loaded configuration, keypair, PacketClient, and PacketWallet.
 */
export function GetUserConfig(): Promise<PacketMcpConfig> {
    return new Promise((resolve, reject) => {
        try {
            const rpc = getFromEnvOrThrow("PACKET_RPC_URL");
            const privateKey = getFromEnv("PACKET_PRIVATE_KEY");
            const keypairPath = getFromEnv("PACKET_KEYPAIR_PATH");
            const compressionApiEndpoint = getFromEnv("PACKET_COMPRESSION_API_ENDPOINT") || rpc;
            const proverEndpoint = getFromEnv("PACKET_PROVER_ENDPOINT") || rpc;
            const cluster = getFromEnvOrThrow("PACKET_CLUSTER");

            // resolve wallet
            let keypair: Keypair;
            if (privateKey && keypairPath) {
                throw new Error("Both PACKET_PRIVATE_KEY and PACKET_KEYPAIR_PATH are set. Please set only one of them.");
            } else if (!privateKey && !keypairPath) {
                throw new Error("Neither PACKET_PRIVATE_KEY nor PACKET_KEYPAIR_PATH is set. Please set one of them.");
            } else {
                if (privateKey) {
                    try {
                        keypair = decodeBase58Secret(privateKey);
                    } catch (err) {
                        throw new Error(`Failed to decode PACKET_PRIVATE_KEY: ${err instanceof Error ? err.message : String(err)}`);
                    }
                } else {
                    try {
                        keypair = loadKeypairFromFile(keypairPath);
                    } catch (err) {
                        throw new Error(`Failed to load keypair PACKET_KEYPAIR_PATH from ${keypairPath}. ` + `${err instanceof Error ? err.message : String(err)}`);
                    }
                }
            }

            const effectiveConfig: InputConfig = {
                rpc,
                keypair,
                photonRpc: {
                    connection: rpc,
                    compressionApiEndpoint: compressionApiEndpoint,
                    proverEndpoint: proverEndpoint,
                },
                cluster,
            };

            const wallet = DerivePacketWallet(keypair);
            const client = DerivePacketClient(effectiveConfig, wallet);

            return resolve({
                config: {
                    rpc: effectiveConfig.rpc,
                    photonRpc: effectiveConfig.photonRpc,
                    cluster: effectiveConfig.cluster as PacketClientConfig["cluster"] || undefined,
                },
                keypair,
                client,
                wallet,
            });
        } catch (err) {
            reject(new Error(
                `failed to load configuration: ` + `${err instanceof Error ? err.message : String(err)}`
            ));
        }
    });
}

const getFromEnv = (name: string): string | undefined => {
    const value = process.env[name];
    return value !== undefined && value !== "" ? value : undefined;
}

const getFromEnvOrThrow = (name: string): string => {
    const value = getFromEnv(name);
    if (!value) {
        throw new Error(`Environment variable ${name} is required but not set.`);
    }
    return value;
}