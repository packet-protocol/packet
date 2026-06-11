import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { sha256 } from "@noble/hashes/sha2";

import type { PacketClient } from "../../../client";
import type { Bytes } from "../../../types/common";
import * as Pda from "../../../pda";
import { bytesEqual, toBN } from "../../../utils/bytes";
import { sleep } from "../../../utils/helpers";
import { ClientCache } from "../../../core/cache";
import type { Room, RoomEpochHeaderData, RoomMemberData } from "../type";
import { GetRoomAccount } from "../account/room";
import { GetRoomHeaderAccount, GetRoomHeaderRange } from "../account/header";
import { GetRoomMemberAccount } from "../account/member";
import { GetRoomRecipientPages } from "../account/page";
import {
    applyDelta,
    initialRecipientState,
    pagesChainHash,
    recipientActiveSlots,
    stateFromCheckpoint,
    type RecipientState,
} from "../../bgw/recipient";
import { RecipientDescriptorKind } from "../../bgw/constants";
import { headerAad, headerBindingRootFromMemberRoot } from "../../bgw/utils/shared";
import type { BgwParamsClient } from "../../bgw/client/params";
import { resolveBgwParams } from "../../bgw/client/params/default";
import type { BgwBls12381EpochHeader, BgwBls12381UserSecret } from "../../wasm/xpkt-bgw-bls12/types";
import {
    decodeRoomHeaderBytesV2,
    decryptBgwMemberSecret,
    deriveOlderChainKey,
    recipientSlotsRoot,
    unwrapRoomChainKey,
} from "../utils/crypto";
import { concatBytes } from "../../../utils/bytes";
import { RoomMessagesClient, type RoomLoadMessagesOptions, type RoomLoadedMessage } from "./messages";
import type { RoomMessageClient } from "./message";

/** Recipient root-chain verification failed — fail closed, never guess keys. */
export class RoomRecipientChainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RoomRecipientChainError";
    }
}

export type RoomEpochKeyResult =
    | {
        status: "ok";
        epoch: BN;
        chainStartEpoch: BN;
        /** messageEpochKey[epoch] (chain key x_i). */
        key: Uint8Array;
    }
    | {
        /** Expected outcome for e.g. re-added members at old epochs. */
        status: "not-recipient";
        epoch: BN;
    };

export type RoomMyMember = {
    member: RoomMemberData;
    userSecret: BgwBls12381UserSecret;
};

function isCheckpointKind(kind: number): boolean {
    return kind === RecipientDescriptorKind.InlineCheckpoint
        || kind === RecipientDescriptorKind.ExternalCheckpoint;
}

const HEADER_WALK_BATCH = 16;

export type RoomFetchRetryOptions = {
    /** Retries for compressed-account fetches that hit Photon indexer lag. */
    retries?: number;
    /** Delay between retries in ms. */
    delayMs?: number;
};

const DEFAULT_FETCH_RETRIES = 5;
const DEFAULT_FETCH_RETRY_DELAY_MS = 400;

/**
 * Retry a fetch that may transiently return null/incomplete due to Photon
 * indexer lag. Used only for accounts that MUST exist (the room account
 * already references them), so a persistent null is a real failure —
 * callers still fail closed after retries are exhausted.
 */
async function retryFetch<T>(
    fn: () => Promise<T>,
    isComplete: (value: T) => boolean,
    retry?: RoomFetchRetryOptions,
): Promise<T> {
    const retries = retry?.retries ?? DEFAULT_FETCH_RETRIES;
    const delayMs = retry?.delayMs ?? DEFAULT_FETCH_RETRY_DELAY_MS;

    let value = await fn();
    for (let attempt = 0; attempt < retries && !isComplete(value); attempt++) {
        await sleep(delayMs);
        value = await fn();
    }
    return value;
}

/**
 * Reader-path reconstruction of the recipient state bound to the header at
 * `epoch` (shared by RoomClient.recoverEpochKey and RoomAdminClient.Load):
 *
 * 1. Fetch the target header. Walk headers backward (batched ranges) past
 *    Reuse/Delta headers until a checkpoint header — or until epoch 1, whose
 *    implicit base is the initial room state.
 * 2. Rebuild the checkpoint state (InlineCheckpoint: descriptor_bytes inline;
 *    ExternalCheckpoint: fetch staged pages, verify per-page payload hashes +
 *    the page chain hash against the header's bound pages-hash).
 * 3. Apply Delta headers forward, verifying every intermediate state root
 *    against the on-chain header roots; Reuse headers must not change the root.
 * 4. Verify the target's headerBindingRoot binds the final state root.
 *
 * Any mismatch throws RoomRecipientChainError (fail closed).
 */
export async function reconstructRoomRecipientState(params: {
    client: PacketClient;
    room: Room;
    epoch: BN | number;
    headerBatchSize?: number;
    retry?: RoomFetchRetryOptions;
}): Promise<{ state: RecipientState; header: RoomEpochHeaderData }> {
    const { client, room } = params;
    const epoch = toBN(params.epoch);
    if (epoch.lten(0)) {
        throw new Error(`cannot reconstruct recipient state at epoch ${epoch.toString()} (no header)`);
    }

    // Headers at epochs <= room.currentEpoch are guaranteed to exist on-chain;
    // a null here is Photon indexer lag, so retry before failing closed.
    const target = await retryFetch(
        () => GetRoomHeaderAccount(client, room.address, epoch),
        (header) => header !== null,
        params.retry,
    );
    if (!target) {
        throw new RoomRecipientChainError(
            `room header at epoch ${epoch.toString()} not found (after indexer-lag retries)`,
        );
    }

    // Walk back to the nearest checkpoint (or to epoch 1 / initial state).
    const path: RoomEpochHeaderData[] = [target];
    const batch = params.headerBatchSize ?? HEADER_WALK_BATCH;

    while (!isCheckpointKind(path[0].descriptorKind) && path[0].epoch.gtn(1)) {
        const to = path[0].epoch.subn(1);
        const from = BN.max(new BN(1), to.subn(batch - 1));
        const window = await retryFetch(
            () => GetRoomHeaderRange(client, room.address, from, to),
            (headers) => headers.every((h) => h !== null),
            params.retry,
        );

        for (let i = window.length - 1; i >= 0; i--) {
            const header = window[i];
            if (!header) {
                throw new RoomRecipientChainError(
                    `missing room header at epoch ${from.addn(i).toString()} while walking back from ${epoch.toString()} (after indexer-lag retries)`,
                );
            }
            path.unshift(header);
            if (isCheckpointKind(header.descriptorKind)) break;
        }
    }

    // Base state.
    let state: RecipientState;
    let applyFrom = 0;

    const first = path[0];
    if (isCheckpointKind(first.descriptorKind)) {
        let descriptorBytes: Uint8Array;
        let externalPagesHash: Uint8Array | undefined;

        if (first.descriptorKind === RecipientDescriptorKind.ExternalCheckpoint) {
            if (first.descriptorBytes.length !== 32) {
                throw new RoomRecipientChainError(
                    `external checkpoint at epoch ${first.epoch.toString()} must bind a 32-byte pages hash, got ${first.descriptorBytes.length}`,
                );
            }
            const firstPage = await retryFetch(
                () => GetRoomRecipientPages(client, room.address, first.epoch, 1),
                (pages) => pages[0] != null,
                params.retry,
            );
            if (!firstPage[0]) {
                throw new RoomRecipientChainError(`recipient page 0 missing for epoch ${first.epoch.toString()} (after indexer-lag retries)`);
            }
            const pagesTotal = firstPage[0].pagesTotal;
            const pages = pagesTotal > 1
                ? [firstPage[0], ...(await retryFetch(
                    () => GetRoomRecipientPages(client, room.address, first.epoch, pagesTotal),
                    (all) => all.every((p) => p != null),
                    params.retry,
                )).slice(1)]
                : [firstPage[0]];

            const payloads: Uint8Array[] = [];
            for (let i = 0; i < pagesTotal; i++) {
                const page = pages[i];
                if (!page) {
                    throw new RoomRecipientChainError(`recipient page ${i} missing for epoch ${first.epoch.toString()}`);
                }
                if (page.pageIndex !== i || page.pagesTotal !== pagesTotal) {
                    throw new RoomRecipientChainError(`recipient page ${i} metadata mismatch for epoch ${first.epoch.toString()}`);
                }
                if (!bytesEqual(sha256(page.payload), page.payloadHash)) {
                    throw new RoomRecipientChainError(`recipient page ${i} payload hash mismatch for epoch ${first.epoch.toString()}`);
                }
                payloads.push(page.payload);
            }

            const pagesHash = pagesChainHash(payloads);
            if (!bytesEqual(pagesHash, first.descriptorBytes)) {
                throw new RoomRecipientChainError(`recipient page chain hash mismatch for epoch ${first.epoch.toString()}`);
            }

            descriptorBytes = concatBytes(...payloads) as Uint8Array;
            externalPagesHash = pagesHash;
        } else {
            descriptorBytes = first.descriptorBytes;
        }

        state = stateFromCheckpoint({
            room: room.address,
            epoch: first.epoch,
            memberVersion: first.memberVersion,
            mode: first.recipientMode,
            encoding: first.recipientEncoding,
            assignedUntilSlot: first.assignedUntilSlot,
            explicitCount: first.explicitCount,
            descriptorBytes,
            externalPagesHash,
        });

        if (!bytesEqual(state.stateRoot, first.recipientStateRoot)) {
            throw new RoomRecipientChainError(`checkpoint state root mismatch at epoch ${first.epoch.toString()}`);
        }
        applyFrom = 1;
    } else {
        // Walked past epoch 1 without a checkpoint: the base is the implicit
        // initial room state (checkpoint epoch 0).
        state = initialRecipientState(room.address);
    }

    // Forward replay.
    for (let i = applyFrom; i < path.length; i++) {
        const header = path[i];

        if (header.descriptorKind === RecipientDescriptorKind.Delta) {
            state = applyDelta(state, header.deltaOp, header.deltaSlot, header.memberVersion, room.address);
            if (!bytesEqual(state.stateRoot, header.recipientStateRoot)) {
                throw new RoomRecipientChainError(`delta state root mismatch at epoch ${header.epoch.toString()}`);
            }
        } else if (header.descriptorKind === RecipientDescriptorKind.Reuse) {
            if (!bytesEqual(state.stateRoot, header.recipientStateRoot)) {
                throw new RoomRecipientChainError(`reuse header state root mismatch at epoch ${header.epoch.toString()}`);
            }
        } else {
            throw new RoomRecipientChainError(
                `unexpected descriptor kind ${header.descriptorKind} at epoch ${header.epoch.toString()} mid-chain`,
            );
        }
    }

    const expectedBinding = headerBindingRootFromMemberRoot(state.stateRoot);
    if (!bytesEqual(expectedBinding, target.headerBindingRoot)) {
        throw new RoomRecipientChainError(`header binding root mismatch at epoch ${epoch.toString()}`);
    }

    return { state, header: target };
}

/**
 * Reader-side client for a room: membership, epoch-key recovery and messages.
 *
 * Construction follows the inbox/thread Load pattern; BGW params resolve from
 * the explicit override or the process-wide default (resolveBgwParams).
 */
export class RoomClient {

    private myMemberCache?: RoomMyMember;
    private messagesClient?: RoomMessagesClient;
    private readonly epochKeyCache = new ClientCache<BN, { epoch: BN; chainStartEpoch: BN; key: Uint8Array }>(
        (epoch) => epoch.toString(),
    );

    private constructor(
        private readonly client: PacketClient,
        readonly address: PublicKey,
        private room: Room,
        readonly bgwParams: BgwParamsClient,
    ) { }

    get Room(): Room {
        return this.room;
    }

    /** Underlying PacketClient (used by sub-clients like RoomMessageClient). */
    get packetClient(): PacketClient {
        return this.client;
    }

    get roomId(): Uint8Array {
        return this.room.roomId;
    }

    static async Load(params: {
        client: PacketClient;
        /** Room PDA address, or the 32-byte roomId. */
        id: PublicKey | Bytes;
        bgwParams?: BgwParamsClient;
    }): Promise<RoomClient> {
        const address = params.id instanceof PublicKey
            ? params.id
            : Pda.roomPda(params.id, params.client.program.programId);

        const room = await GetRoomAccount(params.client.program, address);
        if (!room) {
            throw new Error(`Room does not exist: ${address.toBase58()}`);
        }

        const engine = await params.client.loadBgwEngine();
        const bgwParams = await resolveBgwParams(engine, params.bgwParams);

        // Fail fast on a wrong artifact, mirroring RoomAdminClient.Load. Without
        // this, a params mismatch surfaces later as an opaque decapsulation
        // failure inside recoverEpochKey rather than a clear setup error.
        const paramsRoot = await bgwParams.getParamsRoot();
        if (!bytesEqual(paramsRoot, room.paramsRoot)) {
            throw new Error(
                `BGW params mismatch for room ${address.toBase58()}: the resolved params root ` +
                `does not match the room's params_root — point this reader at the room's params artifact`,
            );
        }

        return new RoomClient(params.client, address, room, bgwParams);
    }

    async refresh(): Promise<this> {
        const room = await GetRoomAccount(this.client.program, this.address);
        if (!room) {
            throw new Error(`Room does not exist: ${this.address.toBase58()}`);
        }
        this.room = room;
        return this;
    }

    /**
     * Fetch this wallet's RoomMember account and decrypt its BGW user secret
     * with the client's packet crypto identity.
     */
    async myMember(force = false): Promise<RoomMyMember> {
        if (this.myMemberCache && !force) {
            return this.myMemberCache;
        }

        const member = await GetRoomMemberAccount(this.client, this.address, this.client.walletPublicKey);
        if (!member) {
            throw new Error(`wallet ${this.client.walletPublicKey.toBase58()} is not a member of room ${this.address.toBase58()}`);
        }

        const identity = this.client.crypto.requireIdentity();
        const userSecret = await decryptBgwMemberSecret({ secret: member.secret, identity });

        this.myMemberCache = { member, userSecret };
        return this.myMemberCache;
    }

    /** Reconstruct + verify the recipient state bound to the header at `epoch`. */
    async reconstructRecipientState(
        epoch: BN | number,
        options?: { retry?: RoomFetchRetryOptions },
    ): Promise<{ state: RecipientState; header: RoomEpochHeaderData }> {
        return reconstructRoomRecipientState({
            client: this.client,
            room: this.room,
            epoch,
            retry: options?.retry,
        });
    }

    /**
     * Recover messageEpochKey[epoch] (defaults to the latest epoch).
     *
     * Chain-aware: a cached key of a LATER epoch in the same segment is stepped
     * backward instead of running BGW decapsulation again. Returns a typed
     * result — "not-recipient" is an expected outcome, not an error.
     */
    async recoverEpochKey(epochInput?: BN | number): Promise<RoomEpochKeyResult> {
        let epoch: BN;
        if (epochInput === undefined) {
            await this.refresh();
            epoch = this.room.currentEpoch;
        } else {
            epoch = toBN(epochInput);
        }
        if (epoch.lten(0)) {
            throw new Error("room has no published epoch header yet");
        }

        const exact = this.epochKeyCache.get(epoch);
        if (exact) {
            return { status: "ok", epoch, chainStartEpoch: exact.chainStartEpoch, key: exact.key };
        }

        // Same-segment backward derivation from any cached later epoch.
        for (const entry of this.epochKeyCache.values()) {
            if (entry.chainStartEpoch.lte(epoch) && epoch.lte(entry.epoch)) {
                const key = deriveOlderChainKey({ key: entry.key, fromEpoch: entry.epoch, toEpoch: epoch });
                this.epochKeyCache.set(epoch, { epoch, chainStartEpoch: entry.chainStartEpoch, key });
                return { status: "ok", epoch, chainStartEpoch: entry.chainStartEpoch, key };
            }
        }

        const { member, userSecret } = await this.myMember();
        const { state, header } = await this.reconstructRecipientState(epoch);

        // Membership check BEFORE decapsulating: not-recipient is a result.
        const activeSlots = recipientActiveSlots(state);
        if (!activeSlots.includes(member.slot)) {
            return { status: "not-recipient", epoch };
        }

        const plan = this.bgwParams.chooseRecipientPlan({
            assignedUntilSlot: state.assignedUntilSlot,
            activeSlots,
        });

        const decoded = decodeRoomHeaderBytesV2(header.headerBytes);
        const aad = headerAad({
            roomId: this.room.roomId,
            epoch,
            headerBindingRoot: header.headerBindingRoot,
        });

        const capacity = await this.bgwParams.getCapacity();
        const engineHeader: BgwBls12381EpochHeader = {
            capacity: capacity.toNumber(),
            epoch: BigInt(epoch.toString()),
            activeSlots: plan.slots.map((slot) => slot.toNumber()),
            activeSlotsRoot: recipientSlotsRoot({
                mode: plan.mode,
                assignedUntilSlot: plan.assignedUntilSlot,
                slots: plan.slots,
            }),
            headerBindingRoot: header.headerBindingRoot,
            recipientMode: plan.mode,
            assignedUntilSlot: plan.assignedUntilSlot,
            recipientSlots: plan.slots,
            c0G2: decoded.c0G2,
            c1G2: decoded.c1G2,
            epochKeyCommitment: decoded.epochKeyCommitment,
        };

        const material = await this.bgwParams.getDecapsulateMaterial({ plan, userSlot: member.slot });
        const engine = await this.client.loadBgwEngine();

        const kemKey = engine.decapsulateEpochKeyFlat({
            capacity,
            recipientMode: plan.mode,
            assignedUntilSlot: plan.assignedUntilSlot,
            recipientSlots: plan.slots,
            userSecret,
            header: engineHeader,
            aad,
            p1IG1: material.p1IG1,
            denomG1AddFlat: material.denomG1AddFlat,
            denomG1SubFlat: material.denomG1SubFlat,
        });

        const key = await unwrapRoomChainKey({ kemKey, aad, wrapped: decoded.wrappedChainKey });

        this.epochKeyCache.set(epoch, { epoch, chainStartEpoch: header.chainStartEpoch, key });
        return { status: "ok", epoch, chainStartEpoch: header.chainStartEpoch, key };
    }

    /** Messages sub-client (cached). */
    messages(): RoomMessagesClient {
        this.messagesClient ??= new RoomMessagesClient(this.client, this);
        return this.messagesClient;
    }

    /**
     * Single message handle by compressed address or 64-byte clientMsgId
     * (thread-style accessor; passthrough to messages().message()).
     */
    message(ref: PublicKey | Bytes): RoomMessageClient {
        return this.messages().message(ref);
    }

    /** Bucket-based message loading (passthrough to messages().loadMessages()). */
    loadMessages(options: RoomLoadMessagesOptions = {}): Promise<RoomMessageClient[]> {
        return this.messages().loadMessages(options);
    }

    /**
     * Bucket-based message loading returning render-ready `RoomLoadedMessage`
     * structs with resolved content (passthrough to
     * messages().loadMessagesResolved()).
     */
    loadMessagesResolved(options: RoomLoadMessagesOptions = {}): Promise<RoomLoadedMessage[]> {
        return this.messages().loadMessagesResolved(options);
    }
}
