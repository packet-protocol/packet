import { PublicKey, type Keypair } from "@solana/web3.js";
import { AsymmetricEncryptionAlgorithm, PacketEncryptionClient, type PacketClient } from "xpkt-sdk";

export const useCliCrypto = (client: PacketClient, keypair: Keypair) => {
  // Node CLI can use the Solana secret key directly. Browser wallets cannot do this, but CLI can.
  client.useCrypto(new PacketEncryptionClient().useSolanaKeypair(keypair).requireIdentity());
  return client;
};

export const loadReaderForOwner = async (client: PacketClient, owner: PublicKey): Promise<any> => {
  try {
    return await client.loadReaderForOwner({ ownerWallet: owner, fallbackToWalletDerived: true });
  } catch {
    // No on-chain key account? Use wallet-derived fallback
    return client.crypto.reader({
      ownerWallet: owner,
      keyAlg: AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519,
      publicKey: owner.toBytes(),
    });
  }
};

export const maybeDecryptText = async (client: PacketClient, rawText: string, decrypt: boolean): Promise<{
  encrypted: boolean;
  plaintext: string;
}> => {
  if (!decrypt) return { encrypted: false, plaintext: rawText };

  try {
    const res = await client.crypto.maybeDecrypt(rawText);
    return { encrypted: res.encrypted, plaintext: res.plaintext };
  } catch {
    // maybeDecrypt normally handles prefixed content. This fallback catches raw JSON encrypted bodies.
    try {
      const body = client.crypto.fromJson(rawText);
      const plaintext = await client.crypto.decrypt({ body });
      return { encrypted: true, plaintext };
    } catch (err) {
      throw new Error(`Failed to decrypt content: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
};
