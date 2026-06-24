/**
 * Room key schedule + envelope crypto.
 *
 * Pieces:
 * - Epoch-key backward hash chain ("segments"): per segment
 *   `tip = sha256(ROOM_CHAIN_TIP_DOMAIN, gamma, roomId, u64be(chainStartEpoch))`,
 *   `x_CHAIN_MAX = tip`, `x_{i-1} = sha256(ROOM_CHAIN_STEP_DOMAIN, x_i)`,
 *   epoch index `i = epoch - chainStartEpoch + 1` (1-based, <= ROOM_CHAIN_MAX),
 *   `messageEpochKey[epoch] = x_i`. Admin hashes the tip DOWN to i; a reader
 *   holding x_j can step BACKWARD to any i <= j within the same segment.
 * - header_bytes v2 (client-defined, opaque to the program):
 *   `[u8 version=2][c0G2 96][c1G2 96][epochKeyCommitment 32][iv 12][ct 32][tag 16]`
 *   where the trailing 60 bytes are `wrappedChainKey =
 *   AES-256-GCM(key = kemKey, aad = headerAad, plaintext = x_i)`.
 * - Message crypto:
 *   `key = sha256(ROOM_MESSAGE_KEY_DOMAIN, messageEpochKey, roomId, clientMsgId)`,
 *   AES-256-GCM with `aad = ROOM_MESSAGE_AAD_DOMAIN || roomId || clientMsgId`,
 *   stored content = `iv(12) | ct | tag(16)`.
 * - Member-secret envelope: compact binary container v1 (see the member-secret
 *   section below) encrypting the binary BGW user secret to the member's
 *   registered packet key, reusing the packet suites' low-level primitives
 *   (x25519 + HKDF-SHA256 + AES-256-GCM, or ed25519→x25519 + nacl box /
 *   xsalsa20-poly1305). Kept compact (≈123–135 bytes) because it is passed
 *   inline in room_add_member instruction args.
 *
 * AES-GCM primitive: WebCrypto `crypto.subtle`, matching the SDK's
 * Aes256GcmSuite.
 *
 * Key-schedule domains use BIG-endian ints (u64be) to match the WASM engine's
 * internal hashing; this differs from the recipient root chain, which is LE.
 */

import BN from "bn.js";
import { sha256 } from "@noble/hashes/sha2";
import { randomBytes } from "@noble/hashes/utils";

import { x25519 } from "@noble/curves/ed25519";
import tweetnacl from "tweetnacl";

import type { Bytes } from "../../../types/common.js";
import { concatBytes, toBN, u32be, u64be, u64Le } from "../../../utils/bytes.js";
import { utf8, text, toBase64, fromBase64 } from "../../../utils/encoding.js";
import {
    ROOM_BLOB_AAD_DOMAIN,
    ROOM_BLOB_KEY_DOMAIN,
    ROOM_CHAIN_MAX,
    ROOM_CHAIN_STEP_DOMAIN,
    ROOM_CHAIN_TIP_DOMAIN,
    ROOM_MESSAGE_AAD_DOMAIN,
    ROOM_MESSAGE_KEY_DOMAIN,
} from "../../bgw/constants.js";
import type { BgwRecipientMode } from "../../bgw/types/params.js";
import type { BgwBls12381UserSecret } from "../../wasm/xpkt-bgw-bls12/types.js";
import {
    NativeX25519RecipientKeyAdapter,
    SolanaEd25519X25519RecipientKeyAdapter,
} from "../../../crypto/asymmetric/pipeline/recipient-adapters.js";
import {
    HkdfSha256SharedKeyDeriver,
    NaclBoxBeforeSharedKeyDeriver,
} from "../../../crypto/asymmetric/pipeline/shared-key-derivers.js";
import { AsymmetricEncryptionAlgorithm } from "../../../crypto/types/asymmetric.js";
import type { PacketCryptoIdentity, PacketReaderInput } from "../../../crypto/index.js";

// ---------------------------------------------------------------------------
// Epoch-key backward hash chain (segments)
// ---------------------------------------------------------------------------

function require32(value: Bytes, field: string): Bytes {
    if (value.length !== 32) {
        throw new Error(`${field} must be 32 bytes, got ${value.length}`);
    }
    return value;
}

/** Segment tip: x_CHAIN_MAX of the segment starting at chainStartEpoch. */
export function segmentTip(args: {
    /** Admin secret gamma (room-scoped secret scalar bytes). */
    gamma: Bytes;
    /** 32-byte room id. */
    roomId: Bytes;
    chainStartEpoch: BN | number;
}): Uint8Array {
    require32(args.roomId, "roomId");
    return sha256(concatBytes(
        utf8(ROOM_CHAIN_TIP_DOMAIN),
        args.gamma,
        args.roomId,
        u64be(toBN(args.chainStartEpoch)),
    ));
}

/** One backward step: x_{i-1} = sha256(ROOM_CHAIN_STEP_DOMAIN, x_i). */
export function stepChainKeyBack(x: Bytes): Uint8Array {
    require32(x, "chain key");
    return sha256(concatBytes(utf8(ROOM_CHAIN_STEP_DOMAIN), x));
}

/**
 * 1-based chain index of an epoch within its segment:
 * i = epoch - chainStartEpoch + 1. Throws when the epoch precedes the segment
 * or the index would exceed ROOM_CHAIN_MAX (the admin must have broken the
 * chain with a checkpoint before that).
 */
export function chainIndexForEpoch(epoch: BN | number, chainStartEpoch: BN | number): number {
    const e = toBN(epoch);
    const start = toBN(chainStartEpoch);
    if (e.lt(start)) {
        throw new Error(`epoch ${e.toString()} precedes chain segment start ${start.toString()}`);
    }
    const index = e.sub(start).toNumber() + 1;
    if (index > ROOM_CHAIN_MAX) {
        throw new Error(`chain index ${index} exceeds ROOM_CHAIN_MAX ${ROOM_CHAIN_MAX}`);
    }
    return index;
}

/** x_index derived from the segment tip (x_CHAIN_MAX) by hashing down. */
export function chainKeyAtIndex(tip: Bytes, index: number): Uint8Array {
    if (!Number.isInteger(index) || index < 1 || index > ROOM_CHAIN_MAX) {
        throw new Error(`chain index must be in 1..${ROOM_CHAIN_MAX}, got ${String(index)}`);
    }
    let x = require32(tip, "tip");
    for (let i = ROOM_CHAIN_MAX; i > index; i--) {
        x = stepChainKeyBack(x);
    }
    return Uint8Array.from(x);
}

/** Admin path: messageEpochKey[epoch] straight from gamma. */
export function chainKeyForEpoch(args: {
    gamma: Bytes;
    roomId: Bytes;
    chainStartEpoch: BN | number;
    epoch: BN | number;
}): Uint8Array {
    const tip = segmentTip(args);
    return chainKeyAtIndex(tip, chainIndexForEpoch(args.epoch, args.chainStartEpoch));
}

/**
 * Reader path: derive the chain key of an OLDER epoch in the SAME segment by
 * stepping backward from a known key. Both epochs must share chainStartEpoch.
 */
export function deriveOlderChainKey(args: {
    key: Bytes;
    fromEpoch: BN | number;
    toEpoch: BN | number;
}): Uint8Array {
    const from = toBN(args.fromEpoch);
    const to = toBN(args.toEpoch);
    if (to.gt(from)) {
        throw new Error("cannot step the key chain forward (toEpoch > fromEpoch)");
    }
    const steps = from.sub(to).toNumber();
    let x: Uint8Array = Uint8Array.from(require32(args.key, "chain key"));
    for (let i = 0; i < steps; i++) {
        x = stepChainKeyBack(x);
    }
    return x;
}

// ---------------------------------------------------------------------------
// AES-256-GCM with AAD (WebCrypto)
// ---------------------------------------------------------------------------

const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

function importAesGcmKey(rawKey: Bytes): Promise<CryptoKey> {
    if (rawKey.length !== 32) {
        throw new Error("AES-256-GCM requires a 32-byte key");
    }
    return crypto.subtle.importKey(
        "raw",
        rawKey as unknown as Uint8Array<ArrayBuffer>,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"],
    );
}

/** AES-256-GCM encrypt with AAD. Returns iv / ct / tag split out. */
export async function aesGcmEncryptWithAad(args: {
    key: Bytes;
    plaintext: Bytes;
    aad: Bytes;
    /** 12 bytes; random when omitted. */
    iv?: Bytes;
}): Promise<{ iv: Uint8Array; ct: Uint8Array; tag: Uint8Array }> {
    const iv = args.iv ?? randomBytes(GCM_IV_BYTES);
    if (iv.length !== GCM_IV_BYTES) {
        throw new Error(`AES-GCM iv must be ${GCM_IV_BYTES} bytes`);
    }
    const key = await importAesGcmKey(args.key);
    const encrypted = new Uint8Array(await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv as unknown as Uint8Array<ArrayBuffer>,
            additionalData: args.aad as unknown as Uint8Array<ArrayBuffer>,
            tagLength: GCM_TAG_BYTES * 8,
        },
        key,
        args.plaintext as unknown as Uint8Array<ArrayBuffer>,
    ));

    return {
        iv: Uint8Array.from(iv),
        ct: encrypted.slice(0, encrypted.length - GCM_TAG_BYTES),
        tag: encrypted.slice(encrypted.length - GCM_TAG_BYTES),
    };
}

/** AES-256-GCM decrypt with AAD. Throws on tag/AAD mismatch. */
export async function aesGcmDecryptWithAad(args: {
    key: Bytes;
    iv: Bytes;
    ct: Bytes;
    tag: Bytes;
    aad: Bytes;
}): Promise<Uint8Array> {
    if (args.iv.length !== GCM_IV_BYTES) {
        throw new Error(`AES-GCM iv must be ${GCM_IV_BYTES} bytes`);
    }
    if (args.tag.length !== GCM_TAG_BYTES) {
        throw new Error(`AES-GCM tag must be ${GCM_TAG_BYTES} bytes`);
    }
    const key = await importAesGcmKey(args.key);
    const combined = concatBytes(args.ct, args.tag);
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: args.iv as unknown as Uint8Array<ArrayBuffer>,
            additionalData: args.aad as unknown as Uint8Array<ArrayBuffer>,
            tagLength: GCM_TAG_BYTES * 8,
        },
        key,
        combined as unknown as Uint8Array<ArrayBuffer>,
    );
    return new Uint8Array(decrypted);
}

// ---------------------------------------------------------------------------
// header_bytes v2 codec + chain-key wrapping
// ---------------------------------------------------------------------------

export const ROOM_HEADER_BYTES_VERSION = 2;

const G2_BYTES = 96;
const COMMITMENT_BYTES = 32;
const WRAPPED_CT_BYTES = 32; // AES-GCM ct of the 32-byte chain key
export const ROOM_HEADER_BYTES_V2_LENGTH =
    1 + G2_BYTES + G2_BYTES + COMMITMENT_BYTES + GCM_IV_BYTES + WRAPPED_CT_BYTES + GCM_TAG_BYTES; // 285

export type RoomWrappedChainKey = {
    iv: Uint8Array;
    ct: Uint8Array;
    tag: Uint8Array;
};

export type RoomHeaderBytesV2 = {
    version: typeof ROOM_HEADER_BYTES_VERSION;
    c0G2: Uint8Array;
    c1G2: Uint8Array;
    epochKeyCommitment: Uint8Array;
    wrappedChainKey: RoomWrappedChainKey;
};

export function encodeRoomHeaderBytesV2(args: {
    c0G2: Bytes;
    c1G2: Bytes;
    epochKeyCommitment: Bytes;
    wrappedChainKey: RoomWrappedChainKey;
}): Uint8Array {
    if (args.c0G2.length !== G2_BYTES) throw new Error(`c0G2 must be ${G2_BYTES} bytes, got ${args.c0G2.length}`);
    if (args.c1G2.length !== G2_BYTES) throw new Error(`c1G2 must be ${G2_BYTES} bytes, got ${args.c1G2.length}`);
    if (args.epochKeyCommitment.length !== COMMITMENT_BYTES) {
        throw new Error(`epochKeyCommitment must be ${COMMITMENT_BYTES} bytes, got ${args.epochKeyCommitment.length}`);
    }
    const { iv, ct, tag } = args.wrappedChainKey;
    if (iv.length !== GCM_IV_BYTES) throw new Error(`wrapped chain key iv must be ${GCM_IV_BYTES} bytes`);
    if (ct.length !== WRAPPED_CT_BYTES) throw new Error(`wrapped chain key ct must be ${WRAPPED_CT_BYTES} bytes`);
    if (tag.length !== GCM_TAG_BYTES) throw new Error(`wrapped chain key tag must be ${GCM_TAG_BYTES} bytes`);

    return concatBytes(
        Uint8Array.of(ROOM_HEADER_BYTES_VERSION),
        args.c0G2,
        args.c1G2,
        args.epochKeyCommitment,
        iv,
        ct,
        tag,
    );
}

export function decodeRoomHeaderBytesV2(bytes: Bytes): RoomHeaderBytesV2 {
    if (bytes.length !== ROOM_HEADER_BYTES_V2_LENGTH) {
        throw new Error(`header_bytes v2 must be ${ROOM_HEADER_BYTES_V2_LENGTH} bytes, got ${bytes.length}`);
    }
    if (bytes[0] !== ROOM_HEADER_BYTES_VERSION) {
        throw new Error(`unsupported header_bytes version ${bytes[0]} (expected ${ROOM_HEADER_BYTES_VERSION})`);
    }
    let offset = 1;
    const take = (len: number): Uint8Array => {
        const out = Uint8Array.from(bytes.slice(offset, offset + len));
        offset += len;
        return out;
    };
    return {
        version: ROOM_HEADER_BYTES_VERSION,
        c0G2: take(G2_BYTES),
        c1G2: take(G2_BYTES),
        epochKeyCommitment: take(COMMITMENT_BYTES),
        wrappedChainKey: {
            iv: take(GCM_IV_BYTES),
            ct: take(WRAPPED_CT_BYTES),
            tag: take(GCM_TAG_BYTES),
        },
    };
}

/** wrappedChainKey = AES-256-GCM(key = kemKey, aad = headerAad, plaintext = x_i). */
export async function wrapRoomChainKey(args: {
    /** BGW kemKey (encapsulate/decapsulate epochKey output, 32 bytes). */
    kemKey: Bytes;
    /** headerAad(roomId, epoch, headerBindingRoot). */
    aad: Bytes;
    /** Chain key x_i (32 bytes). */
    chainKey: Bytes;
}): Promise<RoomWrappedChainKey> {
    require32(args.chainKey, "chainKey");
    return aesGcmEncryptWithAad({ key: args.kemKey, plaintext: args.chainKey, aad: args.aad });
}

export async function unwrapRoomChainKey(args: {
    kemKey: Bytes;
    aad: Bytes;
    wrapped: RoomWrappedChainKey;
}): Promise<Uint8Array> {
    const chainKey = await aesGcmDecryptWithAad({
        key: args.kemKey,
        iv: args.wrapped.iv,
        ct: args.wrapped.ct,
        tag: args.wrapped.tag,
        aad: args.aad,
    });
    return require32(chainKey, "unwrapped chain key") as Uint8Array;
}

// ---------------------------------------------------------------------------
// Message crypto
// ---------------------------------------------------------------------------

const CLIENT_MSG_ID_BYTES = 64;

function requireMessageInputs(roomId: Bytes, clientMsgId: Bytes): void {
    require32(roomId, "roomId");
    if (clientMsgId.length !== CLIENT_MSG_ID_BYTES) {
        throw new Error(`clientMsgId must be ${CLIENT_MSG_ID_BYTES} bytes, got ${clientMsgId.length}`);
    }
}

/** Fresh random 64-byte client message id. */
export function randomClientMsgId(): Uint8Array {
    return randomBytes(CLIENT_MSG_ID_BYTES);
}

/** key = sha256(ROOM_MESSAGE_KEY_DOMAIN, messageEpochKey, roomId, clientMsgId). */
export function roomMessageKey(args: {
    messageEpochKey: Bytes;
    roomId: Bytes;
    clientMsgId: Bytes;
}): Uint8Array {
    requireMessageInputs(args.roomId, args.clientMsgId);
    require32(args.messageEpochKey, "messageEpochKey");
    return sha256(concatBytes(
        utf8(ROOM_MESSAGE_KEY_DOMAIN),
        args.messageEpochKey,
        args.roomId,
        args.clientMsgId,
    ));
}

/** aad = ROOM_MESSAGE_AAD_DOMAIN || roomId || clientMsgId (raw concat, not hashed). */
export function roomMessageAad(args: { roomId: Bytes; clientMsgId: Bytes }): Uint8Array {
    requireMessageInputs(args.roomId, args.clientMsgId);
    return concatBytes(utf8(ROOM_MESSAGE_AAD_DOMAIN), args.roomId, args.clientMsgId) as Uint8Array;
}

/** Encrypt message plaintext; returns the stored content `iv(12) | ct | tag(16)`. */
export async function encryptRoomMessageContent(args: {
    messageEpochKey: Bytes;
    roomId: Bytes;
    clientMsgId: Bytes;
    plaintext: Bytes;
}): Promise<Uint8Array> {
    const key = roomMessageKey(args);
    const aad = roomMessageAad(args);
    const { iv, ct, tag } = await aesGcmEncryptWithAad({ key, plaintext: args.plaintext, aad });
    return concatBytes(iv, ct, tag) as Uint8Array;
}

/** Decrypt stored content `iv(12) | ct | tag(16)`. Throws on tamper. */
export async function decryptRoomMessageContent(args: {
    messageEpochKey: Bytes;
    roomId: Bytes;
    clientMsgId: Bytes;
    content: Bytes;
}): Promise<Uint8Array> {
    if (args.content.length < GCM_IV_BYTES + GCM_TAG_BYTES) {
        throw new Error(`room message content too short: ${args.content.length} bytes`);
    }
    const key = roomMessageKey(args);
    const aad = roomMessageAad(args);
    return aesGcmDecryptWithAad({
        key,
        iv: args.content.slice(0, GCM_IV_BYTES),
        ct: args.content.slice(GCM_IV_BYTES, args.content.length - GCM_TAG_BYTES),
        tag: args.content.slice(args.content.length - GCM_TAG_BYTES),
        aad,
    });
}

// ---------------------------------------------------------------------------
// Off-chain room body envelope.
//
// A room message stored off-chain (Irys/IPFS/Arweave/URL) keeps the body in a
// single epoch-encrypted envelope instead of a per-recipient packet envelope,
// preserving BGW's one-copy-per-message property. The envelope is
// self-describing: it carries its epoch so a reader recovers the matching epoch
// key (recoverEpochKey) without per-member key material.
//
// Layout: ROOM_BLOB_ENVELOPE_PREFIX + base64([version u8][epoch u64be][iv 12][tag 16][ct]).
//   key = sha256(ROOM_BLOB_KEY_DOMAIN, epochKey, roomId, u64be(epoch))
//   aad = ROOM_BLOB_AAD_DOMAIN || roomId || u64be(epoch)
// ---------------------------------------------------------------------------

function readU64be(bytes: Bytes): bigint {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getBigUint64(0, false);
}

export const ROOM_BLOB_ENVELOPE_PREFIX = "packet:room:v1:";
export const ROOM_BLOB_ENVELOPE_VERSION = 1;

export function isRoomBlobEnvelope(value: string): boolean {
    return value.startsWith(ROOM_BLOB_ENVELOPE_PREFIX);
}

function roomBlobKey(args: { epochKey: Bytes; roomId: Bytes; epoch: BN }): Uint8Array {
    return sha256(concatBytes(utf8(ROOM_BLOB_KEY_DOMAIN), args.epochKey, args.roomId, u64be(args.epoch)));
}

function roomBlobAad(args: { roomId: Bytes; epoch: BN }): Uint8Array {
    return concatBytes(utf8(ROOM_BLOB_AAD_DOMAIN), args.roomId, u64be(args.epoch)) as Uint8Array;
}

export async function encodeRoomBlobEnvelope(args: {
    epochKey: Bytes;
    roomId: Bytes;
    epoch: BN | number;
    plaintext: Bytes;
}): Promise<string> {
    const epoch = toBN(args.epoch);
    const key = roomBlobKey({ epochKey: args.epochKey, roomId: args.roomId, epoch });
    const aad = roomBlobAad({ roomId: args.roomId, epoch });
    const { iv, ct, tag } = await aesGcmEncryptWithAad({ key, plaintext: args.plaintext, aad });
    const body = concatBytes(new Uint8Array([ROOM_BLOB_ENVELOPE_VERSION]), u64be(epoch), iv, tag, ct);
    return ROOM_BLOB_ENVELOPE_PREFIX + toBase64(body);
}

/** Read the envelope's epoch without the key (to recover the matching epoch key). */
export function roomBlobEnvelopeEpoch(envelope: string): BN {
    const body = fromBase64(envelope.slice(ROOM_BLOB_ENVELOPE_PREFIX.length));
    if (body.length < 1 + 8 + GCM_IV_BYTES + GCM_TAG_BYTES) {
        throw new Error("room blob envelope too short");
    }
    if (body[0] !== ROOM_BLOB_ENVELOPE_VERSION) {
        throw new Error(`unsupported room blob envelope version ${body[0]}`);
    }
    return toBN(readU64be(body.slice(1, 9)));
}

export async function decodeRoomBlobEnvelope(args: {
    epochKey: Bytes;
    roomId: Bytes;
    envelope: string;
}): Promise<Uint8Array> {
    const body = fromBase64(args.envelope.slice(ROOM_BLOB_ENVELOPE_PREFIX.length));
    if (body.length < 1 + 8 + GCM_IV_BYTES + GCM_TAG_BYTES) {
        throw new Error("room blob envelope too short");
    }
    if (body[0] !== ROOM_BLOB_ENVELOPE_VERSION) {
        throw new Error(`unsupported room blob envelope version ${body[0]}`);
    }
    const epoch = toBN(readU64be(body.slice(1, 9)));
    const ivStart = 9;
    const tagStart = ivStart + GCM_IV_BYTES;
    const ctStart = tagStart + GCM_TAG_BYTES;
    const key = roomBlobKey({ epochKey: args.epochKey, roomId: args.roomId, epoch });
    const aad = roomBlobAad({ roomId: args.roomId, epoch });
    const plaintext = await aesGcmDecryptWithAad({
        key,
        iv: body.slice(ivStart, tagStart),
        tag: body.slice(tagStart, ctStart),
        ct: body.slice(ctStart),
        aad,
    });
    return plaintext;
}

// ---------------------------------------------------------------------------
// Recipient slots root (mirror of the WASM backend's recipient_slots_root)
// ---------------------------------------------------------------------------

/**
 * Mirror of the WASM backend hash
 * `recipient_slots_root(mode, assigned_until_slot, slots)`:
 *
 *   hash_many("xpkt-bgw-recipient-slots-v2",
 *             [mode_utf8, u64be(assignedUntilSlot), u64be(slot)...])
 *
 * where hash_many length-prefixes every part with the part length as
 * usize.to_be_bytes() — 4 bytes big-endian on the wasm32 target.
 *
 * Readers reconstruct BgwBls12381EpochHeader.activeSlotsRoot with this so the
 * flat decapsulation's root check passes (verified end-to-end against the WASM
 * engine in tests/room-keychain.ts).
 */
export function recipientSlotsRoot(args: {
    mode: BgwRecipientMode;
    assignedUntilSlot: BN | number;
    /** Sorted-unique ascending recipient plan slots. */
    slots: (BN | number)[];
}): Uint8Array {
    if (args.mode !== "include" && args.mode !== "exclude") {
        throw new Error(`invalid recipient mode ${String(args.mode)}`);
    }
    const slots = args.slots.map((s) => toBN(s));
    for (let i = 1; i < slots.length; i++) {
        if (slots[i].lte(slots[i - 1])) {
            throw new Error("recipient plan slots must be sorted unique ascending");
        }
    }
    const lp = (part: Bytes): Bytes => concatBytes(u32be(part.length), part);
    return sha256(concatBytes(
        utf8("xpkt-bgw-recipient-slots-v2"),
        lp(utf8(args.mode)),
        lp(u64be(toBN(args.assignedUntilSlot))),
        ...slots.map((s) => lp(u64be(s))),
    ));
}

// ---------------------------------------------------------------------------
// Member-secret envelope (compact binary container v1)
//
// RoomMember.secret is passed INLINE in room_add_member instruction args, and
// Anchor's BorshInstructionCoder encodes instructions into a fixed 1000-byte
// buffer — so this envelope must stay small. No JSON anywhere.
//
// Container layout (v1):
//   [0]      u8  version            = 1
//   [1]      u8  alg                0 = x25519-hkdf-aes256gcm
//                                   1 = solana-ed25519-x25519-naclbox
//   [2..34]  ephemeral x25519 public key (32)
//   [34..]   nonce                  12 bytes (AES-GCM) / 24 bytes (nacl box)
//   [..end]  ciphertext || tag      (GCM: ct || 16-byte tag appended;
//                                    nacl secretbox: 16-byte tag prepended —
//                                    either way an opaque ct+tag blob)
//
// Plaintext = compact binary user secret (see encodeBgwUserSecretEnvelope):
//   [u8 ver=1][slot u32 LE][capacity u64 LE][dG1 48]            (61 bytes)
//
// Total: 123 bytes (alg 0) / 135 bytes (alg 1).
//
// Domain separation:
// - alg 0 (AES-256-GCM): aad = utf8("xpkt-room-member-secret-v1"), and the
//   same domain string is the HKDF-SHA256 info for the wrapping key.
// - alg 1 (nacl secretbox): no AAD support; the domain is bound through the
//   plaintext version byte ([u8 ver=1]) checked on decode, and the shared key
//   is the raw nacl box precomputation (Wallet Standard compatible — no
//   HKDF/domain mixing, by design, matching the registered-key suite).
//
// The alg byte is chosen from the member's registered reader key algorithm
// (PacketReaderInput.keyAlg); decryptBgwMemberSecret dispatches on it using
// the member's PacketCryptoIdentity. The low-level primitives (ed25519→x25519
// conversion, ECDH/HKDF, nacl box precompute) are REUSED from the packet
// encryption suites' pipeline so keys stay interoperable with the registered
// reader-key universes.
// ---------------------------------------------------------------------------

export const BGW_MEMBER_SECRET_DOMAIN = "xpkt-room-member-secret-v1";
export const BGW_MEMBER_SECRET_VERSION = 1;

export const BGW_MEMBER_SECRET_ALG_X25519_HKDF_AES256GCM = 0;
export const BGW_MEMBER_SECRET_ALG_SOLANA_ED25519_X25519_NACLBOX = 1;

const BGW_USER_SECRET_VERSION = 1;
const BGW_USER_SECRET_DG1_BYTES = 48;
/** [u8 ver][slot u32 LE][capacity u64 LE][dG1 48] */
const BGW_USER_SECRET_BYTES = 1 + 4 + 8 + BGW_USER_SECRET_DG1_BYTES; // 61

const EPHEMERAL_PUB_BYTES = 32;
const NACL_NONCE_BYTES = tweetnacl.secretbox.nonceLength; // 24
const NACL_TAG_BYTES = tweetnacl.secretbox.overheadLength; // 16

/** Compact binary user secret: [u8 ver=1][slot u32 LE][capacity u64 LE][dG1 48]. */
export function encodeBgwUserSecretEnvelope(userSecret: BgwBls12381UserSecret): Uint8Array {
    const slot = userSecret.slot.toNumber();
    if (!Number.isInteger(slot) || slot <= 0 || slot > 0xffff_ffff) {
        throw new Error(`invalid slot in BGW user secret: ${userSecret.slot.toString()}`);
    }
    if (userSecret.capacity.lten(0) || userSecret.capacity.byteLength() > 8) {
        throw new Error(`invalid capacity in BGW user secret: ${userSecret.capacity.toString()}`);
    }
    if (userSecret.dG1.length !== BGW_USER_SECRET_DG1_BYTES) {
        throw new Error(`dG1 must be ${BGW_USER_SECRET_DG1_BYTES} bytes, got ${userSecret.dG1.length}`);
    }
    const out = new Uint8Array(BGW_USER_SECRET_BYTES);
    out[0] = BGW_USER_SECRET_VERSION;
    const view = new DataView(out.buffer);
    view.setUint32(1, slot, true);
    out.set(u64Le(userSecret.capacity), 5);
    out.set(userSecret.dG1, 13);
    return out;
}

export function decodeBgwUserSecretEnvelope(bytes: Bytes): BgwBls12381UserSecret {
    if (bytes.length !== BGW_USER_SECRET_BYTES) {
        throw new Error(`BGW user secret must be ${BGW_USER_SECRET_BYTES} bytes, got ${bytes.length}`);
    }
    if (bytes[0] !== BGW_USER_SECRET_VERSION) {
        throw new Error(`unsupported BGW user secret version ${bytes[0]}`);
    }
    const data = Uint8Array.from(bytes);
    const view = new DataView(data.buffer);
    const slot = view.getUint32(1, true);
    const capacity = new BN(data.slice(5, 13), "le");
    if (slot <= 0) {
        throw new Error("invalid slot in BGW user secret envelope");
    }
    if (capacity.lten(0)) {
        throw new Error("invalid capacity in BGW user secret envelope");
    }
    return {
        slot: new BN(slot),
        capacity,
        dG1: data.slice(13),
    };
}

function memberSecretAlgByte(keyAlg: AsymmetricEncryptionAlgorithm): number {
    switch (keyAlg) {
        case AsymmetricEncryptionAlgorithm.X25519:
            return BGW_MEMBER_SECRET_ALG_X25519_HKDF_AES256GCM;
        case AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519:
            return BGW_MEMBER_SECRET_ALG_SOLANA_ED25519_X25519_NACLBOX;
        default:
            throw new Error(`unsupported reader key algorithm for member secret: ${String(keyAlg)}`);
    }
}

/**
 * Encrypt a member's BGW user secret to their registered packet encryption
 * key as the compact binary container v1 (see section comment). The returned
 * bytes are stored on-chain as RoomMember.secret. Single reader by design —
 * the envelope must stay inside the instruction-arg budget.
 */
export async function encryptBgwMemberSecret(args: {
    userSecret: BgwBls12381UserSecret;
    readers: PacketReaderInput[];
}): Promise<Uint8Array> {
    if (!args.readers.length) {
        throw new Error("at least one reader is required to encrypt a BGW member secret");
    }
    if (args.readers.length !== 1) {
        throw new Error("the compact member-secret envelope supports exactly one reader");
    }
    const reader = args.readers[0];
    const alg = memberSecretAlgByte(reader.keyAlg);
    const plaintext = encodeBgwUserSecretEnvelope(args.userSecret);

    const ephemeralPrivate = randomBytes(32);
    const ephemeralPublic = x25519.getPublicKey(ephemeralPrivate);

    if (alg === BGW_MEMBER_SECRET_ALG_X25519_HKDF_AES256GCM) {
        const adapter = new NativeX25519RecipientKeyAdapter();
        const key = new HkdfSha256SharedKeyDeriver().deriveKey({
            localPrivateKey: ephemeralPrivate,
            remotePublicKey: adapter.toAgreementPublicKey(reader.publicKey),
            context: { info: utf8(BGW_MEMBER_SECRET_DOMAIN) },
            keyLength: 32,
        });
        const { iv, ct, tag } = await aesGcmEncryptWithAad({
            key,
            plaintext,
            aad: utf8(BGW_MEMBER_SECRET_DOMAIN),
        });
        return concatBytes(
            Uint8Array.of(BGW_MEMBER_SECRET_VERSION, alg),
            ephemeralPublic,
            iv,
            ct,
            tag,
        ) as Uint8Array;
    }

    // SOLANA-ED25519-X25519: nacl box precompute + xsalsa20-poly1305.
    const adapter = new SolanaEd25519X25519RecipientKeyAdapter();
    const key = new NaclBoxBeforeSharedKeyDeriver().deriveKey({
        localPrivateKey: ephemeralPrivate,
        remotePublicKey: adapter.toAgreementPublicKey(reader.publicKey),
        keyLength: 32,
    });
    const nonce = randomBytes(NACL_NONCE_BYTES);
    const sealed = tweetnacl.secretbox(plaintext, nonce, key as Uint8Array);
    return concatBytes(
        Uint8Array.of(BGW_MEMBER_SECRET_VERSION, alg),
        ephemeralPublic,
        nonce,
        sealed,
    ) as Uint8Array;
}

/** Decrypt RoomMember.secret (compact binary container v1) with the member's packet crypto identity. */
export async function decryptBgwMemberSecret(args: {
    secret: Bytes;
    identity: PacketCryptoIdentity;
}): Promise<BgwBls12381UserSecret> {
    const secret = Uint8Array.from(args.secret);
    if (secret.length < 2 + EPHEMERAL_PUB_BYTES) {
        throw new Error(`RoomMember.secret too short: ${secret.length} bytes`);
    }
    if (secret[0] !== BGW_MEMBER_SECRET_VERSION) {
        throw new Error(`unsupported member secret envelope version ${secret[0]}`);
    }
    const alg = secret[1];
    if (alg !== memberSecretAlgByte(args.identity.keyAlg)) {
        throw new Error(
            `member secret envelope alg ${alg} does not match identity key algorithm ${args.identity.keyAlg}`,
        );
    }
    const ephemeralPublic = secret.slice(2, 2 + EPHEMERAL_PUB_BYTES);
    const rest = secret.slice(2 + EPHEMERAL_PUB_BYTES);

    if (alg === BGW_MEMBER_SECRET_ALG_X25519_HKDF_AES256GCM) {
        if (rest.length < GCM_IV_BYTES + GCM_TAG_BYTES) {
            throw new Error("member secret envelope truncated (GCM)");
        }
        const adapter = new NativeX25519RecipientKeyAdapter();
        const key = new HkdfSha256SharedKeyDeriver().deriveKey({
            localPrivateKey: adapter.toAgreementPrivateKey(args.identity.keyPair.privateKey),
            remotePublicKey: ephemeralPublic,
            context: { info: utf8(BGW_MEMBER_SECRET_DOMAIN) },
            keyLength: 32,
        });
        const plaintext = await aesGcmDecryptWithAad({
            key,
            iv: rest.slice(0, GCM_IV_BYTES),
            ct: rest.slice(GCM_IV_BYTES, rest.length - GCM_TAG_BYTES),
            tag: rest.slice(rest.length - GCM_TAG_BYTES),
            aad: utf8(BGW_MEMBER_SECRET_DOMAIN),
        });
        return decodeBgwUserSecretEnvelope(plaintext);
    }

    if (rest.length < NACL_NONCE_BYTES + NACL_TAG_BYTES) {
        throw new Error("member secret envelope truncated (nacl box)");
    }
    const adapter = new SolanaEd25519X25519RecipientKeyAdapter();
    const key = new NaclBoxBeforeSharedKeyDeriver().deriveKey({
        localPrivateKey: adapter.toAgreementPrivateKey(args.identity.keyPair.privateKey),
        remotePublicKey: ephemeralPublic,
        keyLength: 32,
    });
    const opened = tweetnacl.secretbox.open(
        rest.slice(NACL_NONCE_BYTES),
        rest.slice(0, NACL_NONCE_BYTES),
        key as Uint8Array,
    );
    if (!opened) {
        throw new Error("member secret envelope authentication failed");
    }
    return decodeBgwUserSecretEnvelope(opened);
}
