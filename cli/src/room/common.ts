import { PublicKey, Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import {
  PacketPDAs,
  configureDefaultBgwParams,
  type PacketClient,
} from "xpkt-sdk";
import { GetUserConfig } from "../config/get.js";
import { parsePublicKey } from "../input/index.js";
import type { PacketCliConfig } from "../config/types.js";

let bgwConfigured = false;

// Wire the default BGW params source from env then config (env wins). Room
// commands need it to encapsulate/decapsulate epoch keys.
export const configureBgwParamsFromConfig = (config: PacketCliConfig): void => {
  if (bgwConfigured) return;

  const envDir = process.env.PACKET_BGW_PARAMS_DIR?.trim();
  const envUrl = process.env.PACKET_BGW_PARAMS_URL?.trim();
  const dir = envDir || config.config.bgwParams?.dir;
  const url = envUrl || config.config.bgwParams?.url;

  if (dir) {
    configureDefaultBgwParams({ dir });
  } else if (url) {
    configureDefaultBgwParams({ manifestUrl: url });
  } else {
    // use defaults
  }

  bgwConfigured = true;
};

export const setupRoom = (): {
  keypair: Keypair;
  client: PacketClient;
  config: PacketCliConfig;
} => {
  const config = GetUserConfig();
  const { keypair, client } = config;
  // Raw-keypair identity: required for room member-secret decryption.
  client.useSolanaCryptoKeypair(keypair);
  configureBgwParamsFromConfig(config);
  return { keypair, client, config };
};

// A room ref is the 32-byte roomId (hex) or the room PDA base58 address.
export type RoomRef = { roomId?: Uint8Array; address?: PublicKey };

const HEX32 = /^(0x)?[0-9a-fA-F]{64}$/;

export const parseRoomRef = (value: string): RoomRef => {
  const trimmed = value.trim();
  if (HEX32.test(trimmed)) {
    const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
    return { roomId: hexToBytes(hex) };
  }
  return { address: parsePublicKey(trimmed, "<roomId>") };
};

// Resolve a RoomRef to a room PDA address.
export const roomRefToAddress = (
  ref: RoomRef,
  client: PacketClient
): PublicKey => {
  if (ref.address) return ref.address;
  if (ref.roomId) {
    return PacketPDAs.room(ref.roomId, client.program.programId);
  }
  throw new Error("invalid room reference");
};

// A RoomClient.Load / room() id input from a RoomRef.
export const roomRefId = (ref: RoomRef): PublicKey | Uint8Array => {
  if (ref.address) return ref.address;
  if (ref.roomId) return ref.roomId;
  throw new Error("invalid room reference");
};

export const hexToBytes = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) throw new Error("hex string must have even length");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

export const bytesToHex = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("hex");

// signMessage adapter over a Solana keypair (Ed25519 detached signature).
export const keypairSignMessage =
  (keypair: Keypair) =>
  async (message: Uint8Array): Promise<Uint8Array> => {
    return nacl.sign.detached(message, keypair.secretKey);
  };
