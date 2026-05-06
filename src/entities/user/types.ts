import type { PublicKey } from "@solana/web3.js";

export type PacketUser = {
    address: PublicKey;
    owner: PublicKey;
    name: string;
    uri: string;
    agent: PublicKey | null;
};

export type CreateUserParams = {
    /**
     * Logical user owner. Defaults to current wallet.
     */
    owner?: PublicKey;

    /**
     * Display name.
     *
     * On-chain max: 32 bytes.
     */
    name: string;

    /**
     * Profile metadata URI.
     *
     * On-chain max: 200 bytes.
     */
    uri: string;

    /**
     * Optional 8004 agent identity account.
     *
     * see: https://github.com/QuantuLabs/8004-solana
     * 
     * The program validates that agent_identity.agent_wallet == owner.
     */
    agentIdentity?: PublicKey | null;
};

export type EditUserParams = {
    /**
     * Logical user owner. Defaults to current wallet.
     */
    owner?: PublicKey;

    /**
     * Display name.
     *
     * On-chain max: 32 bytes.
     */
    name: string;

    /**
     * Profile metadata URI.
     *
     * On-chain max: 200 bytes.
     */
    uri: string;

    /**
     * Optional 8004 agent identity account.
     *
     * Pass null/undefined to clear agent link.
     */
    agentIdentity?: PublicKey | null;
};