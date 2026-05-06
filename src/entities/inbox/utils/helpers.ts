import { InboxKind } from "../types";

export const NumberToInboxKind = (number: number): InboxKind => {
    switch (number) {
        case 0:
            return InboxKind.Standard;
        case 1:
            return InboxKind.Ephemeral;
        default:
            throw new Error("Unsupported inbox kind");
    }
}