import { type Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import { type PacketClient, type PacketSignMessage } from "xpkt-sdk";
import { useMcpCrypto } from "../message/crypto.js";

// Rooms need the raw-keypair crypto identity so member secrets can be decrypted
// via SOLANA_ED25519_X25519 derived from the wallet key (no registered key).
export const useRoomCrypto = (client: PacketClient, keypair: Keypair) => {
  useMcpCrypto(client, keypair);
  client.useSolanaCryptoKeypair(keypair);
  return client;
};

export const keypairSignMessage = (keypair: Keypair): PacketSignMessage => {
  return async (message: Uint8Array) => nacl.sign.detached(message, keypair.secretKey);
};
