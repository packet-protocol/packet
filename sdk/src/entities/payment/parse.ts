import type { ThreadEscrowInfo } from "../thread/types.js";
import { ParsePaymentRuleTokenProgram } from "./helpers.js";
import type { Escrow, Payment, PaymentRule } from "./types.js";

export const ParsePaymentRuleOption = (payment: any): PaymentRule | null => {
    if (!payment) return null;
    if (payment.inner?.tag?.[0] === 0) return null;

    const value = payment.inner?.value ?? payment;

    return {
        inner: value.inner as Payment,
        escrow: ParseEscrowOption(value.escrow),
        tokenProgram: ParsePaymentRuleTokenProgram(value.tokenProgram),
    };
};

export const ParseEscrowOption = (escrow: any): Escrow | null => {
    if (!escrow) return null;
    if (escrow.inner?.tag?.[0] === 0) return null;
    return (escrow.inner?.value ?? escrow) as Escrow;
};

export const ParseThreadEscrowInfoOption = (escrow: any): ThreadEscrowInfo | null => {
    if (!escrow) return null;
    if (escrow.inner?.tag?.[0] === 0) return null;

    const value = escrow.inner?.value ?? escrow;

    return {
        senderApproval: value.senderApproval === 1,
        receiverApproval: value.receiverApproval === 1,
        releaseTime: value.releaseTime,
        released: value.released === 1,
        amount: value.amount,
        mint: value.mint,
        tokenProgram: ParsePaymentRuleTokenProgram(value.tokenProgram),
        escrow: value.escrow as Escrow,
    };
};