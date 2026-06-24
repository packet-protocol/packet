import { sha256 } from "@noble/hashes/sha2";
import { utf8 } from "../../../utils/encoding.js";
import { concatBytes, u64be } from "../../../utils/bytes.js";
import type { BN } from "../../../index.js";

export function headerAad(args: {
  roomId: Uint8Array;
  epoch: BN;
  headerBindingRoot: Uint8Array;
}): Uint8Array {
  return sha256(concatBytes(
    utf8("xpkt-bgw-admin-v1-bls12-381-header-aad"),
    args.roomId,
    u64be(args.epoch),
    args.headerBindingRoot,
  ));
}

export function headerBindingRootFromMemberRoot(memberRoot: Uint8Array): Uint8Array {
  return sha256(concatBytes(
    utf8("xpkt-bgw-header-member-root-v1"),
    memberRoot
  ));
}