import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

import type { PacketClient } from "../../../client.js";
import { PacketTransactionClient } from "../../transaction/client.js";
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types.js";
import { derivePacketRoomAdminSeed, type DerivePacketRoomAdminSeedInput } from "../utils/seed.js";
import type { PacketSignMessage } from "../../../crypto/packet/seed.js";
import type { Bytes } from "../../../types/index.js";
import type { PacketReaderInput } from "../../../crypto/index.js";
import * as Pda from "../../../pda.js";
import { bytesEqual } from "../../../utils/bytes.js";
import type { BgwBls12381AdminSecret, BgwBls12381RoomPublicKey } from "../../wasm/xpkt-bgw-bls12/types.js";
import type { BgwParamsClient } from "../../bgw/client/params/index.js";
import { resolveBgwParams } from "../../bgw/client/params/default.js";
import { CreateRoomTx } from "../transactions/create.js";
import { RoomAddMemberTx } from "../transactions/add-member.js";
import { RoomRemoveMemberTx } from "../transactions/remove-member.js";
import { RoomPublishHeaderTx } from "../transactions/publish-header.js";
import { RoomStageRecipientPageTx } from "../transactions/stage-recipient-page.js";
import { RoomReinitRootTx } from "../transactions/reinit-root.js";
import type { Room } from "../type/index.js";
import { GetRoomAccount } from "../account/room.js";
import { GetRoomMemberAccount, getActiveMemberAccountsForRoom } from "../account/member.js";
import { headerAad, headerBindingRootFromMemberRoot } from "../../bgw/utils/shared.js";
import {
    applyDelta,
    initialRecipientState,
    planNextDescriptor,
    recipientActiveSlots,
    stateFromCheckpoint,
    type RecipientDescriptorPlan,
    type RecipientState,
} from "../../bgw/recipient.js";
import {
    RECIPIENT_CHECKPOINT_INTERVAL,
    RecipientDeltaOp,
    RecipientDescriptorKind,
    ROOM_CHAIN_MAX,
    type RecipientDeltaOpId,
} from "../../bgw/constants.js";
import { PacketEncryptionClient } from "../../encryption/client.js";
import {
    chainIndexForEpoch,
    chainKeyAtIndex,
    encodeRoomHeaderBytesV2,
    encryptBgwMemberSecret,
    segmentTip,
    wrapRoomChainKey,
} from "../utils/crypto.js";
import { reconstructRoomRecipientState } from "./room.js";

export type CreateRoomParams = {
    /* 32 byte random value */
    roomId?: Bytes;
    /* 32 byte SECRET seed for admin */
    seed: Bytes;
}

export type RoomMutationInput = {
    /** RecipientDeltaOp.Activate (1) or RecipientDeltaOp.Remove (2). */
    op: RecipientDeltaOpId;
    /** 1-based member slot the mutation targets. */
    slot: number;
};

export type RoomPublishedHeader = {
    epoch: BN;
    kind: "reuse" | "delta" | "inlineCheckpoint" | "externalCheckpoint";
    chainBreak: boolean;
    chainStartEpoch: BN;
    memberVersion: BN;
    recipientStateRoot: Uint8Array;
    /** Page-staging signatures (external checkpoints) followed by the publish signature(s). */
    signatures: string[];
};

export type RoomMemberMutationResult = {
    member: PublicKey;
    slot: number;
    /** Signatures of the member mutation tx followed by the header tx(s). */
    signatures: string[];
    header: RoomPublishedHeader;
};

/**
 * Which key the member's BGW secret was encrypted to:
 * - "registered": the member's registered packet encryption key (user key account);
 * - "wallet-derived": the SOLANA_ED25519_X25519 reader derived from the wallet
 *   public key itself. Decryptable only with the RAW wallet keypair
 *   (SDK/CLI/MCP) — browser-wallet members cannot decrypt these and should be
 *   warned to register a packet key instead.
 */
export type RoomMemberKeySource = "registered" | "wallet-derived";

export type RoomAddMemberResult = RoomMemberMutationResult & {
    /** Which key model the member secret was encrypted to. */
    memberKey: RoomMemberKeySource;
};

export type RoomResetMemberResult = {
    member: PublicKey;
    /** Slot the member was (re)assigned in the new era (1-based, in input order). */
    slot: number;
    /** Which key model the member's new-era secret was encrypted to. */
    memberKey: RoomMemberKeySource;
};

/**
 * Result of {@link RoomAdminClient.resetRoomToRoot}: the room's new era, the
 * members re-seeded into it, and every signature produced (the reset tx, then
 * the per-member add + header txs in order).
 */
export type RoomResetResult = {
    room: PublicKey;
    /** The new era (previous era + 1). */
    era: BN;
    /** Members re-added as the starting members of the new era, in input order. */
    members: RoomResetMemberResult[];
    /** reset tx signature(s), then each member's add + header tx signatures, in order. */
    signatures: string[];
};

/**
 * Admin-side room client: room creation, membership mutations and epoch
 * header publication (descriptor planning + BGW encapsulation + key schedule).
 */
export class RoomAdminClient {

    #adminSecret: BgwBls12381AdminSecret;
    #state: RecipientState;
    private room?: Room;

    private constructor(
        private readonly client: PacketClient,
        readonly address: PublicKey,
        readonly roomId: Bytes,
        readonly roomPublicKey: BgwBls12381RoomPublicKey,
        adminSecret: BgwBls12381AdminSecret,
        readonly bgwParams: BgwParamsClient,
        state: RecipientState,
        room?: Room,
    ) {
        this.#adminSecret = adminSecret;
        this.#state = state;
        this.room = room;
    }

    get Room(): Room {
        if (!this.room) {
            throw new Error("Room account not loaded yet; call refresh()");
        }
        return this.room;
    }

    /** Local recipient state mirror (matches the latest activated header). */
    get recipientState(): RecipientState {
        return this.#state;
    }

    async refresh(): Promise<this> {
        const room = await GetRoomAccount(this.client.program, this.address);
        if (!room) {
            throw new Error(`Room does not exist: ${this.address.toBase58()}`);
        }
        this.room = room;
        return this;
    }

    static async CreateManual(params: {
        client: PacketClient;
        params: CreateRoomParams & { roomId: Bytes },
        options?: PacketIxOptions & PacketTxOptions,
        bgwParams?: BgwParamsClient
    }) {
        if (params.params.roomId.length !== 32) {
            throw new Error("roomId must be 32 bytes");
        }

        const engine = await params.client.loadBgwEngine();
        const bgwParams = params.bgwParams ?? await resolveBgwParams(engine);
        const paramsManifest = await bgwParams.getManifest();
        const paramsId = await bgwParams.getParamsId();
        const paramsRoot = await bgwParams.getParamsRoot();

        const adminSecret = engine.deriveAdminSecret(params.params.seed, new BN(paramsManifest.capacity));
        const roomPublicKey = engine.deriveRoomPublicKey(adminSecret);

        const roomPda = Pda.roomPda(params.params.roomId, params.client.program.programId);

        const optionsOverride = params.options ?? params.client.defaultTxOptions ?? {};

        const tx = await CreateRoomTx(
            params.client.connection,
            params.client.walletPublicKey,
            params.client.program,
            {
                roomId: params.params.roomId,
                paramsId,
                paramsRoot,
            },
            optionsOverride,
        );

        const transactionClient = new PacketTransactionClient(params.client.connection);
        transactionClient.addTransaction(...tx);

        const signatures = await transactionClient.submitAndConfirm(params.client.wallet, optionsOverride?.options);

        try {
            return {
                receipt: signatures,
                client: new RoomAdminClient(
                    params.client,
                    roomPda,
                    params.params.roomId,
                    roomPublicKey,
                    adminSecret,
                    bgwParams,
                    // Fresh room: member_version 0, epoch 0, initial recipient state.
                    initialRecipientState(roomPda),
                ),
            };
        } catch (error) {
            throw new Error(`Failed to load room ${roomPda.toBase58()} after creation: ${error instanceof Error ? error.message : String(error)}, signatures: ${signatures.join(", ")}`);
        }
    }

    static async Create(params: {
        client: PacketClient;
        params: Omit<DerivePacketRoomAdminSeedInput, "roomId" | "adminAddress"> & {
            roomId?: Bytes;
        },
        options?: PacketIxOptions & PacketTxOptions,
        bgwParams?: BgwParamsClient,
    }) {
        const roomId = params.params.roomId ?? crypto.getRandomValues(new Uint8Array(32));
        if (roomId.length !== 32) {
            throw new Error("roomId must be 32 bytes");
        }

        const seed = await derivePacketRoomAdminSeed({
            roomId,
            adminAddress: params.options?.owner ?? params.client.wallet.publicKey,
            signMessage: params.params.signMessage,
            origin: params.params.origin,
        })

        return this.CreateManual({
            client: params.client,
            params: {
                roomId,
                seed: seed.seed,
            },
            options: params.options,
            bgwParams: params.bgwParams,
        });
    }

    /**
     * Recover an admin client for an existing room: fetch the Room account,
     * re-derive the admin secret (explicit seed or signMessage derivation) and
     * reconstruct the local recipient state from the on-chain header chain.
     */
    static async Load(params: {
        client: PacketClient;
        /** 32-byte room id (or pass `address`). */
        roomId?: Bytes;
        /** Room PDA address (or pass `roomId`). */
        address?: PublicKey;
        /** 32-byte admin seed. Either this or `signMessage`. */
        seed?: Bytes;
        /** Wallet signMessage for derivePacketRoomAdminSeed (with optional `origin`). */
        signMessage?: PacketSignMessage;
        origin?: string;
        bgwParams?: BgwParamsClient;
    }): Promise<RoomAdminClient> {
        if (!params.roomId && !params.address) {
            throw new Error("RoomAdminClient.Load requires roomId or address");
        }

        const address = params.address
            ?? Pda.roomPda(params.roomId as Bytes, params.client.program.programId);

        const room = await GetRoomAccount(params.client.program, address);
        if (!room) {
            throw new Error(`Room does not exist: ${address.toBase58()}`);
        }
        const roomId = room.roomId;

        let seed = params.seed;
        if (!seed) {
            if (!params.signMessage) {
                throw new Error("RoomAdminClient.Load requires either `seed` or `signMessage`");
            }
            seed = (await derivePacketRoomAdminSeed({
                roomId,
                adminAddress: params.client.walletPublicKey,
                signMessage: params.signMessage,
                origin: params.origin,
            })).seed;
        }

        const engine = await params.client.loadBgwEngine();
        const bgwParams = await resolveBgwParams(engine, params.bgwParams);
        const paramsManifest = await bgwParams.getManifest();

        const paramsRoot = await bgwParams.getParamsRoot();
        if (!bytesEqual(paramsRoot, room.paramsRoot)) {
            throw new Error(
                `BGW params mismatch for room ${address.toBase58()}: the resolved params root does not match the room's params_root`,
            );
        }

        const adminSecret = engine.deriveAdminSecret(seed, new BN(paramsManifest.capacity));
        const roomPublicKey = engine.deriveRoomPublicKey(adminSecret);

        let state: RecipientState;
        if (room.currentEpoch.isZero()) {
            state = initialRecipientState(address);
        } else {
            state = (await reconstructRoomRecipientState({
                client: params.client,
                room,
                epoch: room.currentEpoch,
            })).state;
        }

        if (!bytesEqual(state.stateRoot, room.recipientStateRoot)) {
            throw new Error(
                `reconstructed recipient state root does not match the room mirror for ${address.toBase58()}`,
            );
        }

        return new RoomAdminClient(
            params.client,
            address,
            roomId,
            roomPublicKey,
            adminSecret,
            bgwParams,
            state,
            room,
        );
    }

    /**
     * Add (or re-activate) a member: extract their BGW user secret, encrypt it
     * to their key (registered packet key when present, wallet-derived
     * ed25519→x25519 otherwise — registration is NOT required), send the add
     * tx and publish the covering Delta/checkpoint header.
     *
     * The result's `memberKey` reports which key model was used so callers
     * can warn members that need to register (browser wallets cannot decrypt
     * wallet-derived envelopes).
     */
    async addMember(params: {
        member: PublicKey;
        /**
         * Skip the registered-key lookup entirely and ALWAYS encrypt the
         * member secret to the wallet-derived ed25519→x25519 reader. Only
         * appropriate when the member is known to control their raw wallet
         * keypair (SDK/CLI/MCP identities).
         */
        skipKeyCheck?: boolean;
        options?: PacketIxOptions & PacketTxOptions;
    }): Promise<RoomAddMemberResult> {
        const room = await this.#gateCheckedRoom();

        const existing = await GetRoomMemberAccount(this.client, this.address, room.era, params.member);
        if (existing && existing.status === 0) {
            throw new Error(`${params.member.toBase58()} is already an active member of this room`);
        }
        // Re-activation keeps the original slot.
        const slot = existing ? existing.slot : room.nextSlot;

        const engine = await this.client.loadBgwEngine();
        const userSecret = engine.extractUserSecretFromG1Power(
            this.#adminSecret,
            slot,
            await this.bgwParams.getUserSecretMaterial(slot),
        );

        let reader: PacketReaderInput;
        let memberKey: RoomMemberKeySource;
        if (params.skipKeyCheck) {
            // Caller vouches for a raw-keypair identity: no lookup, always
            // encrypt to the wallet-derived ed25519→x25519 reader.
            reader = PacketEncryptionClient.LoadWalletDerivedReader(params.member);
            memberKey = "wallet-derived";
        } else {
            try {
                // Registered packet key when present, wallet-derived fallback
                // otherwise — key registration is NOT required to be added.
                const info = await PacketEncryptionClient.LoadReaderInfoForOwner(this.client, {
                    ownerWallet: params.member,
                    fallbackToWalletDerived: true,
                });
                reader = info.reader;
                memberKey = info.source;
            } catch (err) {
                // With the wallet-derived fallback enabled, the only failure
                // here is the registered-key LOOKUP itself (RPC error etc).
                throw new Error(
                    `failed to look up the registered packet encryption key for member ${params.member.toBase58()} ` +
                    `(retry, or pass skipKeyCheck: true to encrypt to the wallet-derived key without a lookup): ` +
                    `${err instanceof Error ? err.message : String(err)}`,
                    { cause: err },
                );
            }
        }

        const bgwMemberSecret = await encryptBgwMemberSecret({ userSecret, readers: [reader] });

        const optionsOverride = params.options ?? this.client.defaultTxOptions ?? {};
        if (!optionsOverride.lookupTables) {
            optionsOverride.lookupTables = await this.client.loadLookupTables();
        }
        const tx = await RoomAddMemberTx(
            this.client.connection,
            this.client.lightRpc,
            this.client.walletPublicKey,
            this.client.program,
            {
                roomId: this.roomId,
                era: room.era,
                member: params.member,
                bgwMemberSecret,
            },
            optionsOverride,
        );
        const mutationClient = new PacketTransactionClient(this.client.connection);
        mutationClient.addTransaction(...tx);
        const mutationSignatures = await mutationClient.submitAndConfirm(this.client.wallet, optionsOverride?.options);

        const header = await this.#publishHeaderGuarded(
            { op: RecipientDeltaOp.Activate, slot },
            mutationSignatures,
            params.options,
        );

        return {
            member: params.member,
            slot,
            memberKey,
            signatures: [...mutationSignatures, ...header.signatures],
            header,
        };
    }

    /** Remove a member and publish the covering Delta/checkpoint header. */
    async removeMember(params: {
        member: PublicKey;
        options?: PacketIxOptions & PacketTxOptions;
    }): Promise<RoomMemberMutationResult> {
        const room = await this.#gateCheckedRoom();

        const existing = await GetRoomMemberAccount(this.client, this.address, room.era, params.member);
        if (!existing) {
            throw new Error(`${params.member.toBase58()} is not a member of this room`);
        }
        if (existing.status !== 0) {
            throw new Error(`${params.member.toBase58()} is already removed from this room`);
        }

        const optionsOverride = params.options ?? this.client.defaultTxOptions ?? {};
        if (!optionsOverride.lookupTables) {
            optionsOverride.lookupTables = await this.client.loadLookupTables();
        }
        const tx = await RoomRemoveMemberTx(
            this.client.connection,
            this.client.lightRpc,
            this.client.walletPublicKey,
            this.client.program,
            {
                roomId: this.roomId,
                era: room.era,
                member: params.member,
                // The (still encrypted) envelope stays on the removed member account.
                bgwMemberSecret: existing.secret,
            },
            optionsOverride,
        );
        const mutationClient = new PacketTransactionClient(this.client.connection);
        mutationClient.addTransaction(...tx);
        const mutationSignatures = await mutationClient.submitAndConfirm(this.client.wallet, optionsOverride?.options);

        const header = await this.#publishHeaderGuarded(
            { op: RecipientDeltaOp.Remove, slot: existing.slot },
            mutationSignatures,
            params.options,
        );

        return {
            member: params.member,
            slot: existing.slot,
            signatures: [...mutationSignatures, ...header.signatures],
            header,
        };
    }

    /**
     * Completely reset a poisoned room to its root ("genesis") state in a NEW
     * era, re-seeding the given members as the STARTING members of that era.
     *
     * A room's capacity / epoch / per-member key state is baked into the room
     * derivation and the on-chain header chain, so a room created in a bad state
     * cannot be repaired in place. This is the single recovery entry point:
     *
     *  1. `room_reinit_root` — bump `room.era` and reset every epoch / header /
     *     recipient / message-ordering mirror back to genesis (epoch 0,
     *     member_version 0, empty recipient set, publication closed). The room
     *     PDA / `roomId` / `admin` / BGW params are preserved.
     *  2. For each starting member, in order, run the normal add-member flow
     *     under the bumped era: this creates a FRESH per-era member account at
     *     `["room-member", room, newEra, owner]` with a newly derived BGW slot
     *     key, and publishes the covering header. The first add publishes the
     *     new era's genesis (epoch 1, chain-break) header.
     *
     * IMPORTANT (what a reset is, and is not):
     *  - It does NOT mutate the old era's accounts. Room headers / members /
     *    messages are Light Protocol compressed accounts whose addresses are
     *    single-init and derived from `[..., room, era, ...]`; the only way to
     *    re-establish a clean epoch-1 root for the same room identity is a new
     *    era with a fresh compressed-address namespace. The old era's accounts
     *    remain in the tree but are unreferenced (this is the point — the
     *    poisoned/undecryptable state is abandoned).
     *  - Members are necessarily re-keyed: each gets a new slot (1..n in input
     *    order) and a fresh BGW user secret for the new era, re-encrypted to
     *    their key. Members re-join automatically; no member action is required.
     *
     * @param params.members Starting members for the new era, in the desired
     *   slot order. When omitted, the current era's active members are
     *   discovered from chain (best-effort; pass an explicit set for a
     *   deterministic membership and slot order).
     */
    async resetRoomToRoot(params: {
        members?: PublicKey[];
        /** Forwarded to each {@link addMember}: always wallet-derive the secret. */
        skipKeyCheck?: boolean;
        options?: PacketIxOptions & PacketTxOptions;
    } = {}): Promise<RoomResetResult> {
        await this.refresh();

        // Resolve the starting member set BEFORE the reset (deduped, order
        // preserved). Explicit set wins; otherwise discover the current era's
        // active members from chain.
        let members: PublicKey[];
        if (params.members) {
            members = params.members;
        } else {
            const active = await getActiveMemberAccountsForRoom({
                client: this.client,
                room: this.address,
                era: this.Room.era,
            });
            // Order by the original slot so the new-era slots track the old order.
            members = active
                .sort((a, b) => a.slot - b.slot)
                .map((m) => new PublicKey(m.owner));
        }
        const seen = new Set<string>();
        members = members.filter((m) => {
            const k = m.toBase58();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });

        const optionsOverride = params.options ?? this.client.defaultTxOptions ?? {};
        if (!optionsOverride.lookupTables) {
            optionsOverride.lookupTables = await this.client.loadLookupTables();
        }

        const signatures: string[] = [];

        // 1. Reset the room to a fresh root state in a new era.
        const resetTx = await RoomReinitRootTx(
            this.client.connection,
            this.client.walletPublicKey,
            this.client.program,
            { roomId: this.roomId },
            optionsOverride,
        );
        const resetClient = new PacketTransactionClient(this.client.connection);
        resetClient.addTransaction(...resetTx);
        signatures.push(...await resetClient.submitAndConfirm(this.client.wallet, optionsOverride?.options));

        // Adopt the new era + genesis local state.
        await this.refresh();
        this.#state = initialRecipientState(this.address);
        const era = this.Room.era;

        // 2. Re-seed the members under the new era. addMember derives a fresh
        // per-era member account + BGW slot key and publishes the covering
        // header; the first add publishes the new era's genesis header.
        const seededMembers: RoomResetMemberResult[] = [];
        for (const member of members) {
            const added = await this.addMember({
                member,
                skipKeyCheck: params.skipKeyCheck,
                options: params.options,
            });
            seededMembers.push({ member, slot: added.slot, memberKey: added.memberKey });
            signatures.push(...added.signatures);
        }

        return {
            room: this.address,
            era,
            members: seededMembers,
            signatures,
        };
    }

    /**
     * Publish the header covering one pending membership mutation (the room's
     * member_version must already be latest_header_member_version + 1).
     *
     * Also the recovery path when a mutation tx landed but its header tx
     * failed: call this with the pending mutation's op + slot.
     */
    async publishMutationHeader(params: {
        mutation: RoomMutationInput;
        options?: PacketIxOptions & PacketTxOptions;
    }): Promise<RoomPublishedHeader> {
        if (params.mutation.op !== RecipientDeltaOp.Activate && params.mutation.op !== RecipientDeltaOp.Remove) {
            throw new Error(`invalid mutation op ${params.mutation.op}`);
        }
        return this.#publishHeader({ mutation: params.mutation, options: params.options });
    }

    /**
     * Publish a key-rotation header without a membership mutation (Reuse, or a
     * forced checkpoint at epoch 1 / on chain overflow).
     */
    async publishReuseHeader(params: {
        options?: PacketIxOptions & PacketTxOptions;
    } = {}): Promise<RoomPublishedHeader> {
        return this.#publishHeader({ options: params.options });
    }

    /**
     * Inspect whether the room has an unfinished header publication: a
     * membership mutation that landed without its covering header, or a staged
     * external checkpoint that was opened but not activated. Membership cannot
     * advance until it is resolved (resumePendingHeader).
     */
    async pendingPublication(): Promise<{
        needsHeader: boolean;
        publicationOpen: boolean;
        uncoveredMutation: boolean;
        pendingEpoch: BN;
        pagesDone: number;
        pagesTotal: number;
    }> {
        await this.refresh();
        const room = this.Room;
        const uncoveredMutation = !room.memberVersion.eq(room.latestHeaderMemberVersion);
        const publicationOpen = room.publicationOpen !== 0;
        return {
            needsHeader: uncoveredMutation || publicationOpen,
            publicationOpen,
            uncoveredMutation,
            pendingEpoch: room.pendingEpoch,
            pagesDone: room.pendingPagesDone,
            pagesTotal: room.pendingPagesTotal,
        };
    }

    /**
     * Finish an unfinished header publication (idempotent). Returns null when
     * nothing is pending. For an uncovered mutation the op/slot is derived from
     * chain (the single difference between the last covered recipient set and
     * the current member accounts), so this also works after a fresh Load.
     */
    async resumePendingHeader(
        options?: PacketIxOptions & PacketTxOptions,
    ): Promise<RoomPublishedHeader | null> {
        const status = await this.pendingPublication();
        if (!status.needsHeader) {
            return null;
        }
        if (!status.uncoveredMutation) {
            return this.publishReuseHeader({ options });
        }

        const room = this.Room;
        const covered = room.currentEpoch.isZero()
            ? initialRecipientState(this.address)
            : (await reconstructRoomRecipientState({
                client: this.client,
                room,
                epoch: room.currentEpoch,
            })).state;
        const coveredActive = new Set(recipientActiveSlots({
            mode: covered.mode,
            assignedUntilSlot: covered.assignedUntilSlot,
            explicitSlots: covered.explicitSlots,
        }));

        const members = await getActiveMemberAccountsForRoom({ client: this.client, room: this.address, era: room.era });
        const currentActive = new Set(members.map((m) => m.slot));

        const added = [...currentActive].filter((slot) => !coveredActive.has(slot));
        const removed = [...coveredActive].filter((slot) => !currentActive.has(slot));

        let mutation: RoomMutationInput;
        if (added.length === 1 && removed.length === 0) {
            mutation = { op: RecipientDeltaOp.Activate, slot: added[0] };
        } else if (removed.length === 1 && added.length === 0) {
            mutation = { op: RecipientDeltaOp.Remove, slot: removed[0] };
        } else {
            throw new Error(
                `cannot derive the uncovered mutation from chain (added=[${added.join(",")}], removed=[${removed.join(",")}])`,
            );
        }
        return this.publishMutationHeader({ mutation, options });
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    async #gateCheckedRoom(): Promise<Room> {
        await this.refresh();
        const room = this.Room;

        if (room.publicationOpen) {
            throw new Error(
                "a staged header publication is open for this room; finish it (publishReuseHeader / publishMutationHeader " +
                "completes the staged external checkpoint) before mutating membership",
            );
        }
        if (!room.memberVersion.eq(room.latestHeaderMemberVersion)) {
            throw new Error(
                "the previous membership mutation has not been covered by a header yet; " +
                "call publishMutationHeader({ mutation: { op, slot } }) for that mutation first",
            );
        }
        return room;
    }

    async #publishHeaderGuarded(
        mutation: RoomMutationInput,
        mutationSignatures: string[],
        options?: PacketIxOptions & PacketTxOptions,
    ): Promise<RoomPublishedHeader> {
        try {
            return await this.#publishHeader({ mutation, options });
        } catch (error) {
            throw new Error(
                `membership mutation landed (${mutationSignatures.join(", ")}) but the header publication failed: ` +
                `${error instanceof Error ? error.message : String(error)}. ` +
                `Recover with publishMutationHeader({ mutation: { op: ${mutation.op}, slot: ${mutation.slot} } }).`,
                { cause: error },
            );
        }
    }

    async #publishHeader(args: {
        mutation?: RoomMutationInput;
        options?: PacketIxOptions & PacketTxOptions;
    }): Promise<RoomPublishedHeader> {
        await this.refresh();
        const room = this.Room;

        // Resync the local state mirror if it drifted (e.g. headers published
        // from another process since Load).
        if (!this.#state.memberVersion.eq(room.latestHeaderMemberVersion)
            || !bytesEqual(this.#state.stateRoot, room.recipientStateRoot)) {
            this.#state = room.currentEpoch.isZero()
                ? initialRecipientState(this.address)
                : (await reconstructRoomRecipientState({ client: this.client, room, epoch: room.currentEpoch })).state;
        }

        const epoch = room.currentEpoch.addn(1);
        const memberVersion = room.memberVersion;

        if (args.mutation) {
            if (!memberVersion.eq(room.latestHeaderMemberVersion.addn(1))) {
                throw new Error(
                    `room member_version (${memberVersion.toString()}) is not latest_header_member_version + 1 ` +
                    `(${room.latestHeaderMemberVersion.toString()} + 1); the mutation tx has not landed (or was already covered)`,
                );
            }
        } else if (!memberVersion.eq(room.latestHeaderMemberVersion)) {
            throw new Error(
                "cannot publish a reuse header while a membership mutation is pending; " +
                "call publishMutationHeader({ mutation: { op, slot } }) instead",
            );
        }

        // Chain-overflow / first-header handling: a continuing segment whose
        // index would exceed ROOM_CHAIN_MAX must checkpoint with a chain break;
        // the epoch-1 header must always break (and thus cannot be Reuse).
        const wouldBreakAnyway = args.mutation?.op === RecipientDeltaOp.Activate;
        const chainOverflow = !wouldBreakAnyway
            && epoch.sub(room.chainStartEpoch).addn(1).gtn(ROOM_CHAIN_MAX);
        const firstHeader = epoch.eqn(1);
        const forceCheckpoint = chainOverflow || (firstHeader && !wouldBreakAnyway);

        // Plan. Forcing a checkpoint = planning from a state at max delta depth.
        let plan: RecipientDescriptorPlan | null = null;
        if (args.mutation) {
            plan = planNextDescriptor(
                forceCheckpoint ? { ...this.#state, deltaDepth: RECIPIENT_CHECKPOINT_INTERVAL } : this.#state,
                { op: args.mutation.op, slot: args.mutation.slot },
            );
        } else if (forceCheckpoint) {
            plan = planNextDescriptor(this.#state);
        }
        // plan === null -> plain Reuse header.

        // New state + on-chain descriptor params.
        let newState: RecipientState;
        let kind: RoomPublishedHeader["kind"];
        let descriptorKindId: number;
        let recipientEncoding: number;
        let deltaOp = RecipientDeltaOp.None as number;
        let deltaSlot = 0;
        let descriptorBytes: Uint8Array = new Uint8Array();
        let chainBreak: boolean;
        let pages: Uint8Array[] | null = null;

        if (!plan) {
            newState = this.#state;
            kind = "reuse";
            descriptorKindId = RecipientDescriptorKind.Reuse;
            recipientEncoding = this.#state.encoding;
            chainBreak = false;
        } else if (plan.kind === "delta") {
            newState = applyDelta(this.#state, plan.op, plan.slot, memberVersion, this.address);
            kind = "delta";
            descriptorKindId = RecipientDescriptorKind.Delta;
            recipientEncoding = plan.encoding;
            deltaOp = plan.op;
            deltaSlot = plan.slot;
            chainBreak = plan.op === RecipientDeltaOp.Activate;
        } else {
            const external = plan.kind === "externalCheckpoint";
            newState = stateFromCheckpoint({
                room: this.address,
                epoch,
                memberVersion,
                mode: plan.mode,
                encoding: plan.encoding,
                assignedUntilSlot: plan.assignedUntilSlot,
                explicitCount: plan.explicitCount,
                descriptorBytes: plan.descriptorBytes,
                externalPagesHash: plan.kind === "externalCheckpoint" ? plan.pagesHash : undefined,
            });
            kind = external ? "externalCheckpoint" : "inlineCheckpoint";
            descriptorKindId = external
                ? RecipientDescriptorKind.ExternalCheckpoint
                : RecipientDescriptorKind.InlineCheckpoint;
            recipientEncoding = plan.encoding;
            // A checkpoint breaks when it covers an Activate mutation, when the
            // chain would overflow, or when it is the very first header.
            chainBreak = args.mutation?.op === RecipientDeltaOp.Activate || chainOverflow || firstHeader;
            if (plan.kind === "externalCheckpoint") {
                pages = plan.pages;
                descriptorBytes = new Uint8Array(); // program binds pending_pages_hash
            } else {
                descriptorBytes = plan.descriptorBytes;
            }
        }

        const headerBindingRoot = headerBindingRootFromMemberRoot(newState.stateRoot);
        const aad = headerAad({ roomId: this.roomId, epoch, headerBindingRoot });

        // BGW encapsulation to the NEW recipient set.
        const activeSlots = recipientActiveSlots(newState);
        const kemPlan = this.bgwParams.chooseRecipientPlan({
            assignedUntilSlot: newState.assignedUntilSlot,
            activeSlots,
        });
        const material = await this.bgwParams.getEncapsulateMaterial(kemPlan);
        const capacity = await this.bgwParams.getCapacity();
        const engine = await this.client.loadBgwEngine();

        const encapsulated = engine.encapsulateEpochKeyFlat({
            capacity,
            recipientMode: kemPlan.mode,
            assignedUntilSlot: kemPlan.assignedUntilSlot,
            recipientSlots: kemPlan.slots,
            epoch,
            aad,
            headerBindingRoot,
            roomVG2: this.roomPublicKey.vG2,
            p1NG1: material.p1NG1,
            p21G2: material.p21G2,
            c1G2AddFlat: material.c1G2AddFlat,
            c1G2SubFlat: material.c1G2SubFlat,
        });

        // Key schedule: chain key x_i of this epoch's segment, wrapped under
        // the KEM key.
        const chainStartEpoch = chainBreak ? epoch : room.chainStartEpoch;
        const tip = segmentTip({
            gamma: this.#adminSecret.gamma,
            roomId: this.roomId,
            chainStartEpoch,
        });
        const chainKey = chainKeyAtIndex(tip, chainIndexForEpoch(epoch, chainStartEpoch));
        const wrappedChainKey = await wrapRoomChainKey({
            kemKey: encapsulated.epochKey,
            aad,
            chainKey,
        });

        const headerBytes = encodeRoomHeaderBytesV2({
            c0G2: encapsulated.header.c0G2,
            c1G2: encapsulated.header.c1G2,
            epochKeyCommitment: encapsulated.header.epochKeyCommitment,
            wrappedChainKey,
        });

        const optionsOverride = args.options ?? this.client.defaultTxOptions ?? {};
        if (!optionsOverride.lookupTables) {
            optionsOverride.lookupTables = await this.client.loadLookupTables();
        }
        const signatures: string[] = [];

        // External checkpoint: stage pages strictly in order, one tx each
        // (index 0 opens/resets the staged publication).
        if (pages) {
            for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                const stageTx = await RoomStageRecipientPageTx(
                    this.client.connection,
                    this.client.lightRpc,
                    this.client.walletPublicKey,
                    this.client.program,
                    {
                        roomId: this.roomId,
                        era: room.era,
                        epoch,
                        pageIndex,
                        pagesTotal: pages.length,
                        payload: pages[pageIndex],
                    },
                    optionsOverride,
                );
                const stageClient = new PacketTransactionClient(this.client.connection);
                stageClient.addTransaction(...stageTx);
                signatures.push(...await stageClient.submitAndConfirm(this.client.wallet, optionsOverride?.options));
            }
        }

        const publishTx = await RoomPublishHeaderTx(
            this.client.connection,
            this.client.lightRpc,
            this.client.walletPublicKey,
            this.client.program,
            {
                roomId: this.roomId,
                era: room.era,
                epoch,
                memberVersion,
                headerBindingRoot,
                descriptorKind: descriptorKindId,
                recipientMode: newState.mode,
                recipientEncoding,
                deltaOp,
                deltaSlot,
                assignedUntilSlot: newState.assignedUntilSlot,
                explicitCount: newState.explicitCount,
                chainBreak,
                descriptorBytes,
                headerBytes,
            },
            optionsOverride,
        );
        const publishClient = new PacketTransactionClient(this.client.connection);
        publishClient.addTransaction(...publishTx);
        signatures.push(...await publishClient.submitAndConfirm(this.client.wallet, optionsOverride?.options));

        // Activation succeeded: adopt the new local state + refresh the room.
        this.#state = newState;
        await this.refresh();

        return {
            epoch,
            kind,
            chainBreak,
            chainStartEpoch,
            memberVersion,
            recipientStateRoot: newState.stateRoot,
            signatures,
        };
    }
}

/**
 * One-call recovery of a poisoned room: load the room's admin client and reset
 * the room to its root state in a new era, re-seeding the existing members as
 * the starting members. Thin wrapper over {@link RoomAdminClient.Load} +
 * {@link RoomAdminClient.resetRoomToRoot} — see that method for the full
 * semantics and the "what a reset is / is not" caveats.
 *
 * Identify the room by `roomId` or `address`, and authorize as admin via an
 * explicit `seed` or the wallet `signMessage` derivation (same as
 * `RoomAdminClient.Load`). When `members` is omitted the current era's active
 * members are discovered from chain.
 */
export async function resetRoomToRoot(params: {
    client: PacketClient;
    /** 32-byte room id (or pass `address`). */
    roomId?: Bytes;
    /** Room PDA address (or pass `roomId`). */
    address?: PublicKey;
    /** 32-byte admin seed. Either this or `signMessage`. */
    seed?: Bytes;
    /** Wallet signMessage for derivePacketRoomAdminSeed (with optional `origin`). */
    signMessage?: PacketSignMessage;
    origin?: string;
    bgwParams?: BgwParamsClient;
    /** Starting members for the new era, in slot order. Discovered from chain when omitted. */
    members?: PublicKey[];
    /** Forwarded to each add-member: always wallet-derive the member secret. */
    skipKeyCheck?: boolean;
    options?: PacketIxOptions & PacketTxOptions;
}): Promise<RoomResetResult> {
    const admin = await RoomAdminClient.Load({
        client: params.client,
        roomId: params.roomId,
        address: params.address,
        seed: params.seed,
        signMessage: params.signMessage,
        origin: params.origin,
        bgwParams: params.bgwParams,
    });

    return admin.resetRoomToRoot({
        members: params.members,
        skipKeyCheck: params.skipKeyCheck,
        options: params.options,
    });
}
