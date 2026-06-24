import * as anchor from "@anchor-lang/core";
import type { PacketProgram } from "../../../providers/program.js";
import { PublicKey } from "@solana/web3.js";
import type { Inbox, InboxArchive, InboxBody, InboxMetadata } from "../types.js";
import type { PacketIDL } from "../../../idl/packet.idl.js";
import { NumberToInboxKind } from "../utils/helpers.js";
import { ParsePaymentRuleOption } from "../../payment/parse.js";
import { bn, type Rpc } from "@lightprotocol/stateless.js";
import { parseSegment } from "../../segment/parse.js";
import BN from "bn.js";
import * as Pda from "../../../pda.js";

export const GetInboxAccount = async (
    program: PacketProgram,
    address: PublicKey
) => {

    const account = await program.account.inbox.fetchNullable(address);

    if (!account) {
        return null;
    }

    return account
}

export const GetInboxBodyAccount = async (
    program: PacketProgram,
    address: PublicKey
) => {

    const account = await program.account.inboxBody.fetchNullable(address);

    if (!account) {
        return null;
    }

    return account
}

export const GetInboxArchiveAccount = async (
    rpc: Rpc,
    address: PublicKey,
    archiveIndex: BN,
    program: PacketProgram
) => {
    const archiveAddress = Pda.inboxArchivePda(address, archiveIndex, program.programId);

    const data = await rpc.getCompressedAccount(bn(archiveAddress.toBytes()));
    if (!data?.data) {
        return null;
    }

    const coder = new anchor.BorshCoder(program.idl);
    const decoded: anchor.IdlEvents<PacketIDL>["inboxArchive"] = coder.types.decode(
        "inboxArchive",
        data.data.data
    );

    return {
        owner: decoded.owner,
        id: decoded.id,
        index: decoded.index,
        raw: parseSegment(decoded.raw.raw)
    }
}

export const InboxAccountToInbox = (address: PublicKey, account: anchor.IdlAccounts<PacketIDL>["inbox"]): Inbox => {
    return {
        address: address,
        kind: NumberToInboxKind(account.kind),
        owner: account.owner,
        id: account.id,
        index: account.index,
        len: account.len,
        lastUpdated: account.lastUpdated.toNumber(),
        paymentRule: ParsePaymentRuleOption(account.paymentRule)
    }
}

export const InboxBodyAccountToInboxBody = (account: anchor.IdlAccounts<PacketIDL>["inboxBody"]): InboxBody => {
    return {
        raw: parseSegment(account.raw.raw)
    }
}

export const InboxArchiveCompressedAccountToInboxArchive = (account: anchor.IdlEvents<PacketIDL>["inboxArchive"]): InboxArchive => {
    return {
        owner: account.owner,
        id: account.id,
        index: account.index,
        raw: parseSegment(account.raw.raw)
    }
}

export const GetInboxMetadata = async (
    program: PacketProgram,
    address: PublicKey
): Promise<InboxMetadata | null> => {
    const account = Pda.inboxMetadataPda(address, program.programId);

    const metadataAccount = await program.account.inboxMetadata.fetchNullable(account);

    if (!metadataAccount) {
        return null
    }

    return {
        name: metadataAccount.name,
        uri: metadataAccount.uri
    }
}
