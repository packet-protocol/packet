import BN from "bn.js";
import type { PublicKey } from "@solana/web3.js";
import type { PacketClient } from "../../../client.js";
import { SegmentPageClient } from "../../segment/client.js";
import { GetInboxArchiveAccount } from "../account/get.js";
import * as Pda from "../../../pda.js";

export type InboxBodyPageKind = "live" | "archive";

export class InboxBodyPageClient extends SegmentPageClient {
    constructor(
        client: PacketClient,
        readonly inboxAddress: PublicKey,
        readonly index: BN,
        readonly kind: InboxBodyPageKind,
    ) {
        super(client, `inbox-body:${inboxAddress.toBase58()}:${index.toString()}:${kind}`);
    }

    get isLive(): boolean {
        return this.kind === "live";
    }

    get isArchive(): boolean {
        return this.kind === "archive";
    }

    protected async fetchRawSegment(): Promise<Uint8Array> {
        if (this.kind === "archive") {
            const archive = await GetInboxArchiveAccount(
                this.client.lightRpc,
                this.inboxAddress,
                this.index,
                this.client.program,
            );

            if (!archive) {
                throw new Error(`Inbox archive not found: ${this.index.toString()}`);
            }

            return archive.raw.raw;
        }

        const inboxBodyPda = Pda.inboxBodyPda(this.inboxAddress, this.client.program.programId);

        const bodyAccount = await this.client.program.account.inboxBody.fetchNullable(
            inboxBodyPda,
        );

        if (!bodyAccount) {
            throw new Error("Inbox live body not found");
        }

        return Uint8Array.from(bodyAccount.raw.raw);
    }
}