import { PublicKey } from "@solana/web3.js";
import * as Pda from "../../../pda";
import type { PacketClient } from "../../../client";
import type { Thread } from "../types";
import { GetThreadAccount, ThreadAccountToThread } from "../account/get";
import { MessageClient } from "../../message/client/message";
import type { SendMsgPaymentParams, DisabledPayment } from "../../message/instructions/resolve";
import type { MessageType } from "../../message/types";
import { randomThreadId } from "../../../utils/bytes";
import type { Inbox } from "../../inbox/types";
import type { InboxClient } from "../../inbox/client/inbox";
import { CreateThreadTx } from "../transactions/create";
import { PacketTransactionClient } from "../../transaction/client";
import type { TxReceiptWithClient } from "../../../types/client";
import { SendMsgTx } from "../../message/transactions/send";
import type { PacketIDL } from "../../../idl/packet.idl";
import * as anchor from "@coral-xyz/anchor";
import { EscrowWithdrawTx } from "../transactions/escrow-withdraw";
import { EscrowApproveTx } from "../transactions/escrow-approve";
import BN from "bn.js";
import { NO_INBOX } from "../../../constants";
export type SendMsgParams = {
    messageType: MessageType,
    content: string,
    msgSeq?: number;
    payment?: SendMsgPaymentParams,
    skipActivityCreation?: boolean;
    skipInboxArchivalIx?: boolean;
}

export type SendFirstMsgParams = Omit<SendMsgParams, "msgSeq">;

export type CreateThreadParams = SendFirstMsgParams & {
    to: PublicKey,
    threadId?: number;
    targetInbox?: Inbox | InboxClient,
    payment?: SendMsgPaymentParams | DisabledPayment
}

export class ThreadClient {
    private thread?: Thread;
    private inbox?: InboxClient;
    private initialized = false;

    private lastMessage?: MessageClient;

    private constructor(
        private readonly client: PacketClient,
        readonly address: PublicKey,
        readonly id: number,
        readonly from?: PublicKey,
        readonly to?: PublicKey,
    ) { }

    get Loaded(): boolean {
        return this.initialized;
    }

    get Thread(): Thread {
        if (!this.thread) {
            throw new Error("Thread is not loaded");
        }

        return this.thread;
    }

    get ThreadInfo() {
        if (!this.thread) {
            throw new Error("Thread is not loaded");
        }

        return {
            id: this.thread.id,
            from: this.thread.from,
            to: this.thread.to,
        };
    }

    get Inbox(): InboxClient | undefined {
        if (!this.thread) {
            throw new Error("Thread is not loaded");
        }
        return this.inbox;
    }

    static Create = async (params: {
        client: PacketClient,
        params: CreateThreadParams
    }): Promise<TxReceiptWithClient<ThreadClient>> => {
        const { InboxClient: IC } = await import("../../inbox/client/inbox");
        const threadId = params.params.threadId ?? randomThreadId();
        const address = Pda.threadPda(threadId);

        const lookupTables = await params.client.loadLookupTables();

        const tx = await CreateThreadTx(
            params.client.connection,
            params.client.lightRpc,
            params.client.walletPublicKey,
            params.client.program,
            {
                messageType: params.params.messageType,
                content: Buffer.from(params.params.content),
                messageSeq: 1,
                payment: params.params.payment,
                targetInbox: params.params.targetInbox instanceof IC ? params.params.targetInbox.Inbox : params.params.targetInbox,
                threadInfo: {
                    id: threadId,
                    from: params.client.walletPublicKey,
                    to: params.params.to,
                }
            },
            lookupTables
        );

        const transactionClient = new PacketTransactionClient(params.client.connection);
        transactionClient.addTransaction(...tx);

        await transactionClient.sign(params.client.wallet);

        const signatures = await transactionClient.submitAndConfirm(params.client.wallet);

        try {
            return {
                receipt: signatures,
                client: await ThreadClient.Load({
                    client: params.client,
                    id: address,
                    inbox: params.params.targetInbox instanceof IC ? params.params.targetInbox : undefined,
                })
            };
        } catch (error) {
            throw new Error(`Failed to load thread ${address.toBase58()} after creation: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    static Handle(params: {
        client: PacketClient;
        threadId: number;
    }): ThreadClient {
        const address = Pda.threadPda(params.threadId);

        return new ThreadClient(
            params.client,
            address,
            params.threadId,
        );
    }

    static async LoadById(params: {
        client: PacketClient;
        threadId: number;
    }): Promise<ThreadClient> {
        const thread = ThreadClient.Handle(params);
        await thread.load();
        return thread;
    }

    static async Load(params: {
        client: PacketClient;
        id: PublicKey | BN | number;
        inbox?: Inbox | InboxClient;
    }): Promise<ThreadClient> {
        const threadAddress =
            params.id instanceof PublicKey
                ? params.id
                : Pda.threadPda(params.id instanceof BN ? params.id.toNumber() : params.id);

        const account = await GetThreadAccount(
            params.client.connection,
            params.client.lightRpc,
            params.client.program,
            threadAddress,
        );

        if (!account) {
            throw new Error("Thread does not exist");
        }

        const thread = ThreadAccountToThread(account.data, account.address);

        const client = new ThreadClient(
            params.client,
            account.address,
            thread.id,
            thread.from,
            thread.to,
        );

        client.thread = thread;
        await client.loadInbox({ inbox: params.inbox });

        client.initialized = true;

        return client;
    }

    private async loadInbox(params?: { inbox?: Inbox | InboxClient }) {
        const threadInboxId = this.Thread.inboxId;
        if (threadInboxId && !threadInboxId.eq(NO_INBOX) && !this.inbox) {
            const { InboxClient: IC } = await import("../../inbox/client/inbox");
            let inbox = params?.inbox;
            const inboxAddress = Pda.inboxPda(threadInboxId, this.Thread.to);

            if (inbox && inbox instanceof IC && inbox.address.equals(inboxAddress)) {
                this.inbox = inbox;
            } else if (inbox && !(inbox instanceof IC) && inbox.address.equals(inboxAddress)) {
                this.inbox = await IC.LoadFromInbox({
                    client: this.client,
                    inbox,
                });
            } else {
                this.inbox = await IC.Load({
                    client: this.client,
                    id: inboxAddress,
                });
            }
        }

        return this
    }

    static async LoadFromThread(params: {
        client: PacketClient;
        thread: Thread | ThreadClient;
    }): Promise<ThreadClient> {
        const client = new ThreadClient(
            params.client,
            Pda.threadPda(params.thread.id),
            params.thread.id,
            params.thread.from,
            params.thread.to,
        );

        client.thread = params.thread instanceof ThreadClient ? params.thread.Thread : params.thread;
        await client.loadInbox({ inbox: params.thread instanceof ThreadClient ? params.thread.Inbox : undefined });

        
        client.initialized = true;

        return client;
    }

    async loadFromAccount(params: {
        account: anchor.IdlAccounts<PacketIDL>["thread"],
        inbox?: Inbox | InboxClient | undefined,
    }): Promise<ThreadClient> {
        const thread = ThreadAccountToThread(params.account, Pda.threadPda(params.account.id));

        this.thread = thread;
        await this.loadInbox({ inbox: params.inbox });

        this.initialized = true;

        return this;
    }

    async load(force = false): Promise<this> {
        if (this.initialized && !force) {
            return this;
        }

        const account = await GetThreadAccount(
            this.client.connection,
            this.client.lightRpc,
            this.client.program,
            this.address,
        );

        if (!account) {
            throw new Error("Thread does not exist");
        }

        this.thread = ThreadAccountToThread(account.data, account.address);
        await this.loadInbox();

        this.initialized = true;

        return this;
    }

    async refresh(): Promise<this> {
        return this.load(true);
    }

    getMessage(seq: number): MessageClient {
        if (!this.thread && seq <= 0) {
            throw new Error("Thread must be loaded to infer message sequence");
        }

        return MessageClient.Handle({
            client: this.client,
            threadId: this.id,
            msgSeq: seq,
            thread: this
        });
    }

    async loadMessage(seq: number): Promise<MessageClient> {
        const msg = this.getMessage(seq);
        await msg.load();
        return msg;
    }

    async loadLastMessage(): Promise<MessageClient | null> {
        await this.load();

        if (this.Thread.lastMsgSeq <= 0) {
            return null;
        }

        this.lastMessage = await this.loadMessage(this.Thread.lastMsgSeq);
        return this.lastMessage;
    }

    get LastMessage(): MessageClient | undefined {
        return this.lastMessage;
    }

    async loadMessages(options: {
        limit?: number;
        fromSeq?: number;
        direction?: "backward" | "forward";
    } = {}): Promise<MessageClient[]> {
        await this.load();

        const direction = options.direction ?? "backward";
        const limit = options.limit ?? this.Thread.totalMsgs;
        const fromSeq = options.fromSeq ?? this.Thread.lastMsgSeq;

        const seqs: number[] = [];

        for (let i = 0; i < limit; i++) {
            const seq = direction === "backward"
                ? fromSeq - i
                : fromSeq + i;

            if (seq <= 0 || seq > this.Thread.lastMsgSeq) {
                continue;
            }

            seqs.push(seq);
        }

        const messages = seqs.map((seq) => this.getMessage(seq));

        await Promise.all(messages.map((message) => message.load()));

        return messages;
    }

    // send message
    async sendMessage(params: SendMsgParams): Promise<TxReceiptWithClient<MessageClient>> {
        const msgSeq = params.msgSeq ?? (await this.load()).Thread.lastMsgSeq + 1;

        const lookupTables = await this.client.loadLookupTables();

        const tx = await SendMsgTx(
            this.client.connection,
            this.client.lightRpc,
            this.client.walletPublicKey,
            this.client.program,
            {
                messageType: params.messageType,
                content: Buffer.from(params.content),
                messageSeq: msgSeq,
                payment: params.payment,
                targetInbox: this.Inbox ? this.Inbox.Inbox : undefined,
                threadInfo: this.ThreadInfo,
                skipActivityCreation: params.skipActivityCreation,
                skipInboxArchivalIx: params.skipInboxArchivalIx,
            },
            lookupTables,
        )

        const transactionClient = new PacketTransactionClient(this.client.connection);
        transactionClient.addTransaction(...tx);

        const signatures = await transactionClient.submitAndConfirm(this.client.wallet);

        try {
            return {
                receipt: signatures,
                client: await this.getMessage(msgSeq).loadRetrying(),
            };
        } catch (error) {
            throw new Error(`Failed to load message ${this.id}/${msgSeq} after sending: ${error instanceof Error ? error.message : String(error)}, signatures: ${signatures.join(", ")}`);
        }
    }

    // approve escrow
    async approveEscrow(params: { skipActivityCreation?: boolean } = {}): Promise<TxReceiptWithClient<ThreadClient>> {

        const tx = await EscrowApproveTx(
            this.client.connection,
            this.client.lightRpc,
            this.client.walletPublicKey,
            this.client.program,
            this.Thread,
            params,
        );

        const transactionClient = new PacketTransactionClient(this.client.connection);
        transactionClient.addTransaction(...tx);

        const signatures = await transactionClient.submitAndConfirm(this.client.wallet);

        await this.refresh();

        return {
            receipt: signatures,
            client: this
        };
    }

    // withdraw escrow
    async withdrawEscrow(receiverTokenAccount?: PublicKey): Promise<TxReceiptWithClient<ThreadClient>> {

        const tx = await EscrowWithdrawTx(
            this.client.connection,
            this.client.walletPublicKey,
            this.client.program,
            this.Thread,
            receiverTokenAccount,
        );

        const transactionClient = new PacketTransactionClient(this.client.connection);
        transactionClient.addTransaction(...tx);

        const signatures = await transactionClient.submitAndConfirm(this.client.wallet);

        await this.refresh();
        
        return {
            receipt: signatures,
            client: this,
        };
    }
}