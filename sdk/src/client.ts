import * as anchor from "@anchor-lang/core";
import { AddressLookupTableAccount, Keypair, PublicKey } from "@solana/web3.js";
import {
    makeAnchorProvider,
    makeProgram,
    type PacketProgram,
} from "./providers/program";
import type { Rpc } from "@lightprotocol/stateless.js";
import type { PacketClientConfig, PhotonRpcConfig } from "./types/client";
import { makeLightRpc } from "./providers/light";
import { PacketWallet } from "./entities/wallet";
import { ThreadClient, type CreateThreadParams } from "./entities/thread/client/thread";
import { InboxClient } from "./entities/inbox/client/inbox";
import { ActivityClient } from "./entities/activity/client";
import BN from "bn.js";
import type { CreateInboxParams } from "./entities/inbox/instructions/create";
import { fetchAddressLookupTable } from "./providers/lut/packet-lut";
import { PACKET_LOOK_UP_TABLE, PACKET_LOOK_UP_TABLE_DEVNET, PACKET_PROGRAM_ID } from "./constants";
import type { Inbox } from "./entities/inbox";
import type { Thread } from "./entities/thread";
import { PacketEncryptionClient, type PacketCryptoIdentityInput } from "./entities/encryption";
import type { DerivePacketSeedInput, PacketDerivedCryptoIdentity, PacketReaderInput } from "./crypto";
import { KeyClient } from "./entities/key/client/key";
import type { CreateUserKeyParams } from "./entities/key/types";
import { MessageEventsClient, UserClient, type CreateUserParams } from "./entities";
import type { PacketIxOptions, PacketTxOptions, WithTxOptions } from "./entities/transaction/types";
import { AnchorCpiEventClient } from "./entities/events/cpi-events";

/**
 * PacketClient is the main entry point for interacting with the Packet.
 * 
 * It provides methods for loading and creating threads and inboxes, as well as accessing user activity.
 * 
 * The client is initialized with [`PacketClientConfig`] object that includes a wallet, a connection to the Solana blockchain, and optional RPC endpoints for Photon, if they are different from the default connection.
 */

export class PacketClient {
    #connection: anchor.web3.Connection;
    #wallet: PacketWallet;
    #provider: anchor.AnchorProvider;
    #program: PacketProgram;
    #lightRpc: Rpc;
    #photonRpc?: Readonly<PhotonRpcConfig>;

    private lookupTableCache: AddressLookupTableAccount[] | null = null;
    private cryptoIdentity: PacketEncryptionClient = new PacketEncryptionClient();
    private messageEventsClient?: MessageEventsClient;

    readonly lookUpTableAddress?: anchor.web3.PublicKey;
    readonly cluster: "mainnet" | "devnet";
    readonly programId: anchor.web3.PublicKey;
    readonly cpiEvents: AnchorCpiEventClient;

    defaultTxOptions?: PacketTxOptions;

    constructor(config: PacketClientConfig) {
        this.#connection = typeof config.connection === "string" ? new anchor.web3.Connection(config.connection, { commitment: "confirmed" }) : config.connection;
        this.#wallet = config.wallet ?? PacketWallet.blank();
        this.#photonRpc = config.photonRpc;
        this.lookUpTableAddress = config.lookUpTableAddress ?? (config.cluster === "devnet" ? PACKET_LOOK_UP_TABLE_DEVNET : (typeof config.cluster !== "undefined" && config.cluster !== "mainnet") ? undefined : PACKET_LOOK_UP_TABLE);
        this.cluster = config.cluster ?? "mainnet";
        this.programId = config.programId ?? PACKET_PROGRAM_ID;

        this.#buildRuntime({
            connection: this.#connection,
            wallet: this.#wallet,
            photonRpc: this.#photonRpc,
        });

        if (config.defaultTxOptions) {
            this.defaultTxOptions = config.defaultTxOptions;
            this.defaultTxOptions.priorityFee ??= 1000;
        } else {
            this.defaultTxOptions = config.defaultTxOptions ?? {
                priorityFee: 1000,
            }
        }

         this.cpiEvents = new AnchorCpiEventClient(
            this.program.provider.connection,
            this.program.programId,
            new anchor.BorshCoder(this.program.idl),
            this.connection.commitment === "finalized" ? "finalized" : "confirmed"
        );
    }

    get connection(): anchor.web3.Connection {
        return this.#connection;
    }

    get wallet(): PacketWallet {
        return this.#wallet;
    }

    get walletPublicKey(): PublicKey {
        return this.#wallet.publicKey;
    }

    get provider(): anchor.AnchorProvider {
        return this.#provider;
    }

    get program(): PacketProgram {
        return this.#program;
    }

    get lightRpc(): Rpc {
        return this.#lightRpc;
    }

    get photonRpc(): Readonly<PhotonRpcConfig> | undefined {
        return this.#photonRpc;
    }

    updateWallet(wallet: PacketWallet): this {
        this.#wallet = wallet;
        this.#buildRuntime();
        return this;
    }

    updateRpc(params: {
        connection?: anchor.web3.Connection | string;
        photonRpc?: PhotonRpcConfig;
    }): this {
        if (params.connection) {
            this.#connection = typeof params.connection === "string" ? new anchor.web3.Connection(params.connection, { commitment: "confirmed" }) : params.connection;
        }

        if ("photonRpc" in params) {
            this.#photonRpc = params.photonRpc
        }

        this.#buildRuntime();
        return this;
    }

    #buildRuntime(params?: {
        connection: anchor.web3.Connection;
        wallet?: PacketWallet;
        photonRpc?: Readonly<PhotonRpcConfig>;
    }) {
        const connection = params?.connection ?? this.#connection;
        const wallet = params?.wallet ?? this.#wallet;
        const photonRpc = params?.photonRpc ?? this.#photonRpc;

        const provider = makeAnchorProvider(connection, wallet);
        const program = makeProgram(provider, this.programId);
        const lightRpc = makeLightRpc(connection, photonRpc);

        this.#provider = provider;
        this.#program = program;
        this.#lightRpc = lightRpc;
    }

    loadLookupTables = async (force: boolean = false): Promise<AddressLookupTableAccount[] | undefined> => {
        if (this.lookupTableCache && !force) {
            return this.lookupTableCache;
        }

        if (!this.lookUpTableAddress) {
            return undefined;
        }

        const res = await fetchAddressLookupTable(this.connection, this.lookUpTableAddress);
        this.lookupTableCache = res;
        return res;
    }


    // --- Main Methods ---

    // -- Thread --
    thread(id: PublicKey): Pick<ThreadClient, "load" | "loadRetrying">;
    thread(id: string): Pick<ThreadClient, "load" | "loadRetrying"> | ThreadClient;
    thread(id: BN | number | Thread | ThreadClient): ThreadClient;
    thread(
        id: PublicKey | BN | number | string | Thread | ThreadClient
    ): ThreadClient | Pick<ThreadClient, "load" | "loadRetrying"> {
        if (id instanceof ThreadClient) {
            return ThreadClient.FromThread({
                client: this,
                thread: id,
            });
        }

        if (typeof id === "object" && "address" in id) {
            return ThreadClient.FromThread({
                client: this,
                thread: id,
            });
        }

        if (
            id instanceof PublicKey ||
            (
                typeof id === "string" &&
                /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(id)
            )
        ) {
            return ThreadClient.FromAddress({
                client: this,
                address: id instanceof PublicKey ? id : new PublicKey(id),
            });
        }

        const normalized = BN.isBN(id)
            ? id.toNumber()
            : typeof id === "number"
                ? id
                : Number(id);

        return ThreadClient.Handle({
            client: this,
            id: normalized,
        });
    }

    createThread = async (params: WithTxOptions<CreateThreadParams>) => {
        var { options, ...threadParams } = params;
        return ThreadClient.Create({
            client: this,
            params: threadParams,
            options,
        });
    }

    // -- Inbox --
    inbox = async (id: PublicKey | BN | number | string | Inbox) => {
        if (typeof id === "object" && "address" in id) {
            return InboxClient.LoadFromInbox({
                client: this,
                inbox: id,
            });
        }

        const normalized =
            id instanceof PublicKey
                ? id
                : BN.isBN(id)
                    ? id
                    : typeof id === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(id)
                        ? new PublicKey(id)
                        : new BN(id);

        return InboxClient.Load({
            client: this,
            id: normalized,
        });
    };
    createInbox = async (params: WithTxOptions<CreateInboxParams>) => {
        var { options, ...inboxParams } = params;
        return InboxClient.Create({
            client: this,
            params: inboxParams,
            options,
        });
    };

    // -- Activity --
    activity = (owner: PublicKey = this.walletPublicKey) => {
        return new ActivityClient(this, owner);
    };
    createOrLoadActivity = async (owner?: PublicKey) => {
        return ActivityClient.CreateOrLoad({
            client: this,
            owner: owner ?? this.walletPublicKey,
        });
    }

    // -- crypto --
    /**
 * Crypto helper for encrypting/decrypting message content.
 *
 * This does not send transactions. It only prepares encrypted JSON/content
 * that you can pass into createThread/sendMessage normally.
 */
    get crypto(): PacketEncryptionClient {
        return this.cryptoIdentity;
    }

    /**
     * Advanced: replace the whole crypto session manually.
     */
    set crypto(identity: PacketEncryptionClient) {
        this.cryptoIdentity = identity;
    }

    /**
     * Set the default crypto identity.
     *
     * After this, `client.crypto.encrypt(...)` auto-includes this identity
     * as a reader unless `includeSelf: false` is passed.
     */
    useCrypto(identity: PacketCryptoIdentityInput): this {
        this.cryptoIdentity.use(identity);
        return this;
    }

    /**
     * Node/localnet easy mode.
     *
     * Uses the Solana Keypair directly as the encryption identity.
     * Not available for normal browser wallets because browser wallets do not expose secret keys.
     */
    useSolanaCryptoKeypair(wallet: Keypair): this {
        this.cryptoIdentity.useSolanaKeypair(wallet);
        return this;
    }

    /**
     * Browser-wallet easy mode.
     *
     * User enters a password, signs a deterministic message with their wallet,
     * and the SDK derives a deterministic X25519 encryption key.
     */
    async useWalletPasswordCrypto(
        input: Omit<DerivePacketSeedInput, "walletAddress"> & {
            walletAddress?: PublicKey | string;
        },
    ): Promise<PacketDerivedCryptoIdentity> {
        return this.cryptoIdentity.useWalletPassword({
            ...input,
            walletAddress: input.walletAddress ?? this.walletPublicKey,
        });
    }

    /**
     * Clear the in-memory crypto identity.
     *
     * Useful on logout or wallet switch.
     */
    clearCrypto(): this {
        this.cryptoIdentity.clearIdentity();
        return this;
    }

    // -- User Key --
    key = (owner: PublicKey = this.walletPublicKey) => {
        return new KeyClient(this, owner);
    };

    loadKey = async (owner: PublicKey = this.walletPublicKey) => {
        return this.key(owner).load();
    };

    createKey = async (params: WithTxOptions<CreateUserKeyParams> = {}) => {
        var { options, ...keyParams } = params;
        return KeyClient.Create({
            client: this,
            params: keyParams,
            options,
        });
    };

    /** Load decryption reader for a specific owner */
    loadReaderForOwner = async (params: {
        ownerWallet: PublicKey | string,
        fallbackToWalletDerived?: boolean,
    }): Promise<PacketReaderInput> => {
        return PacketEncryptionClient.LoadReaderForOwner(
            this,
            params
        );
    }

    /** Load wallet-derived decryption reader */
    loadWalletDerivedReader = (ownerWallet: PublicKey | string): PacketReaderInput =>
        PacketEncryptionClient.LoadWalletDerivedReader(ownerWallet);
    static LoadWalletDerivedReader = (ownerWallet: PublicKey | string): PacketReaderInput =>
        PacketEncryptionClient.LoadWalletDerivedReader(ownerWallet);


    /**
     * Create this wallet's public `key` account from the current crypto identity.
     *
     */
    createKeyFromCrypto = async (options?: PacketIxOptions & PacketTxOptions) => {
        return KeyClient.CreateFromCrypto({
            client: this,
            options,
        });
    };

    // -- User --
    user = (owner: PublicKey = this.walletPublicKey) => {
        return new UserClient(this, owner);
    };

    loadUser = async (owner: PublicKey = this.walletPublicKey) => {
        return UserClient.Load({
            client: this,
            owner,
        });
    };

    createUser = async (params: WithTxOptions<CreateUserParams>) => {
        var { options, ...userParams } = params;
        return UserClient.Create({
            client: this,
            params: userParams,
            options,
        });
    };

    // -- Message Events --
    get messageEvents(): MessageEventsClient {
        this.messageEventsClient ??= new MessageEventsClient(this);
        return this.messageEventsClient;
    }
}

