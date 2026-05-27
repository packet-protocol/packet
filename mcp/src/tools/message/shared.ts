import { InboxClient } from "xpkt-sdk";
import { formatPayment, type McpContentBlock } from "../../message/format.js";

export const inboxSummary = (inbox: InboxClient) => {
    return {
        address: inbox.address.toBase58(),
        id: inbox.id.toString(),
        owner: inbox.owner.toBase58(),
        kind: inbox.Inbox?.kind,
        name: inbox.Metadata?.name ?? "",
        uri: inbox.Metadata?.uri ?? "",
        len: inbox.len?.toString?.() ?? "",
        currentIndex: inbox.currentIndex?.toString?.() ?? "",
        lastUpdated: inbox.Inbox?.lastUpdated,
        paymentRule: inbox.Inbox?.paymentRule ? formatPayment(inbox.Inbox.paymentRule.inner) : null,
        escrow: inbox.Inbox?.paymentRule?.escrow ? true : false,
    };
};

export const resourcesFromRows = (rows: any[]): McpContentBlock[] => {
    return rows.flatMap((row) => row?.resources ?? row?.lastMessage?.resources ?? []);
};

export const textResult = (text: string) => {
    return { content: [{ type: "text" as const, text }] };
};

export const contentResult = (text: string, resources: McpContentBlock[]) => {
    return { content: [{ type: "text" as const, text }, ...resources] };
};
