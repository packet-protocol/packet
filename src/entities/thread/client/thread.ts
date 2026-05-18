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
import type { PacketIxOptions, PacketTxOptions } from "../../transaction/types";
export type SendMsgParams = {
    messageType: MessageType,
    content: string,
    msgSeq?: number;
    payment?: SendMsgPaymentParams,
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

    private initialized = false;


    private constructor(
        private readonly client: PacketClient,
        readonly address: PublicKey,
        readonly id: number,
        readonly from?: PublicKey,
        readonly to?: PublicKey,
        private inbox?: InboxClient,
        private lastMessage?: MessageClient,
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
        params: CreateThreadParams,
        options?: PacketIxOptions & PacketTxOptions,
    }): Promise<TxReceiptWithClient<ThreadClient>> => {
        const { InboxClient: IC } = await import("../../inbox/client/inbox");
        const threadId = params.params.threadId ?? randomThreadId();
        const address = Pda.threadPda(threadId, params.client.programId);

        const optionsOverride = params.options ?? params.client.defaultTxOptions ?? {};

        if (!optionsOverride.lookupTables)
            optionsOverride.lookupTables = await params.client.loadLookupTables();

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
            optionsOverride
        );

        const transactionClient = new PacketTransactionClient(params.client.connection);
        transactionClient.addTransaction(...tx);

        const signatures = await transactionClient.submitAndConfirm(params.client.wallet, optionsOverride?.options);

        try {
            return {
                receipt: signatures,
                client: await ThreadClient.Handle({
                    client: params.client,
                    id: threadId,
                }).loadRetrying({
                    inbox: params.params.targetInbox instanceof IC ? params.params.targetInbox : undefined,
                })
            };
        } catch (error) {
            throw new Error(`Failed to load thread ${address.toBase58()} after creation: ${error instanceof Error ? error.message : String(error)}, signatures: ${signatures.join(", ")}`);
        }
    }

    static Handle(params: {
        client: PacketClient;
        id: BN | number;
    }): ThreadClient {
        const address = Pda.threadPda(params.id instanceof BN ? params.id.toNumber() : params.id, params.client.programId);

        return new ThreadClient(
            params.client,
            address,
            params.id instanceof BN ? params.id.toNumber() : params.id,
        );
    }

    static FromAddress = (params: {
        client: PacketClient;
        address: PublicKey;
        inbox?: Inbox | InboxClient;
    }): Pick<ThreadClient, "load" | "loadRetrying"> => {

        const thread = new ThreadClient(
            params.client,
            params.address,
            0, // threadId is not known at this point, but it will be loaded in load()
        );

        return {
            load: thread.load.bind(thread),
            loadRetrying: thread.loadRetrying.bind(thread),
        }
    };

    static FromThread(params: {
        client: PacketClient;
        thread: Thread | ThreadClient;
    }): ThreadClient {
        if (params.thread.id === 0) {
            throw new Error("Thread ID cannot be 0");
        }
        const client = new ThreadClient(
            params.client,
            Pda.threadPda(params.thread.id, params.client.programId),
            params.thread.id,
            params.thread.from,
            params.thread.to,
            params.thread instanceof ThreadClient ? params.thread.Inbox : undefined,
            params.thread instanceof ThreadClient ? params.thread.LastMessage : undefined,
        );

        client.thread = params.thread instanceof ThreadClient ? params.thread.Thread : params.thread;

        client.initialized = params.thread instanceof ThreadClient ? params.thread.Loaded :
            params.thread.inboxId ? false : true; // if thread has inboxId, we need to load it to determine if it's loaded or not

        return client;
    }

    async load({ force = false, inbox }: { force?: boolean, inbox?: Inbox | InboxClient } = {}): Promise<this> {
        if (this.initialized && !force) {
            return this;
        }

        const account = await GetThreadAccount(
            this.client.lightRpc,
            this.client.program,
            this.address,
        );

        if (!account) {
            throw new Error("Thread does not exist");
        }

        this.thread = ThreadAccountToThread(account.data, account.address);
        await this.loadInbox({ inbox });

        this.initialized = true;

        return this;
    }

    async loadFromAccount(params: {
        account: anchor.IdlEvents<PacketIDL>["thread"],
        inbox?: Inbox | InboxClient | undefined,
    }): Promise<ThreadClient> {
        const thread = ThreadAccountToThread(params.account, Pda.threadPda(params.account.id, this.client.programId));

        this.thread = thread;
        await this.loadInbox({ inbox: params.inbox });

        this.initialized = true;

        return this;
    }

    async loadRetrying({ retries = 3, delay = 250, force, inbox }: { retries?: number, delay?: number, force?: boolean, inbox?: Inbox | InboxClient } = {}): Promise<this> {
        for (let i = 0; i < retries; i++) {
            try {
                return await this.load({ force, inbox });
            } catch (error) {
                if (i === retries - 1) {
                    throw error;
                }
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        return this;
    }

    async refresh(params?: Omit<Parameters<typeof this.loadRetrying>[0], "force">): Promise<this> {
        return this.loadRetrying({ ...params, force: true });
    }

    private async loadInbox(params?: { inbox?: Inbox | InboxClient }) {
        const threadInboxId = this.Thread.inboxId;
        if (threadInboxId && !threadInboxId.eq(NO_INBOX) && !this.inbox) {
            const { InboxClient: IC } = await import("../../inbox/client/inbox");
            let inbox = params?.inbox;
            const inboxAddress = Pda.inboxPda(threadInboxId, this.Thread.to, this.client.programId);

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
        limitConcurrentFetch?: number;
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

        const limitConcurrentFetch = options.limitConcurrentFetch ?? 10;

        for (let i = 0; i < messages.length; i += limitConcurrentFetch) {
            await Promise.all(
                messages.slice(i, i + limitConcurrentFetch).map((msg) => msg.load()),
            );
        }

        return messages;
    }

    // send message
    async sendMessage(params: SendMsgParams, options?: PacketIxOptions & PacketTxOptions): Promise<TxReceiptWithClient<MessageClient>> {
        const msgSeq = params.msgSeq ?? (await this.load()).Thread.lastMsgSeq + 1;

        const optionsOverride = options ?? this.client.defaultTxOptions ?? {};

        if (!optionsOverride.lookupTables)
            optionsOverride.lookupTables = await this.client.loadLookupTables();

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
                skipInboxArchivalIx: params.skipInboxArchivalIx,
            },
            optionsOverride,
        )

        const transactionClient = new PacketTransactionClient(this.client.connection);
        transactionClient.addTransaction(...tx);

        const signatures = await transactionClient.submitAndConfirm(this.client.wallet, optionsOverride?.options);

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
    async approveEscrow(params?: {
        options?: PacketIxOptions & PacketTxOptions,
    }): Promise<TxReceiptWithClient<ThreadClient>> {

        const optionsOverride = params.options ?? this.client.defaultTxOptions ?? {};

        const tx = await EscrowApproveTx(
            this.client.lightRpc,
            this.client.connection,
            this.client.walletPublicKey,
            this.client.program,
            this.Thread,
            optionsOverride
        );

        const transactionClient = new PacketTransactionClient(this.client.connection);
        transactionClient.addTransaction(...tx);

        const signatures = await transactionClient.submitAndConfirm(this.client.wallet, optionsOverride?.options);

        await this.refresh();

        return {
            receipt: signatures,
            client: this
        };
    }

    // withdraw escrow
    async withdrawEscrow(params?: {
        receiverTokenAccount?: PublicKey,
        options?: PacketIxOptions & PacketTxOptions,
    }): Promise<TxReceiptWithClient<ThreadClient>> {

        const optionsOverride = params?.options ?? this.client.defaultTxOptions ?? {};

        const tx = await EscrowWithdrawTx(
            this.client.lightRpc,
            this.client.connection,
            this.client.walletPublicKey,
            this.client.program,
            {
                thread: this.Thread,
                receiverTokenAccount: params?.receiverTokenAccount,
            },
            optionsOverride
        );

        const transactionClient = new PacketTransactionClient(this.client.connection);
        transactionClient.addTransaction(...tx);

        const signatures = await transactionClient.submitAndConfirm(this.client.wallet, optionsOverride?.options);

        await this.refresh();

        return {
            receipt: signatures,
            client: this,
        };
    }
}