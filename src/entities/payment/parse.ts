import type { ThreadEscrowInfo } from "../thread/types";
import { ParsePaymentRuleTokenProgram } from "./helpers";
import type { Escrow, Payment, PaymentRule} from "./types";

export const ParsePaymentRuleOption = (payment: any): PaymentRule | null => {
    if (payment.inner.tag[0] === 0) return null;

    return {
        inner: payment.inner.value.inner as Payment,
        escrow: ParseEscrowOption(payment.inner.value.escrow),
        tokenProgram: ParsePaymentRuleTokenProgram(payment.inner.value.tokenProgram)
    }
}

export const ParseEscrowOption = (escrow: any): Escrow | null => {
    if (escrow.inner.tag[0] === 0) return null;

    return escrow.inner.value as Escrow;
}

export const ParseThreadEscrowInfoOption = (escrow: any) : ThreadEscrowInfo | null => {
    if (escrow.inner.tag[0] === 0) return null;
    return {
        senderApproval: escrow.inner.value.senderApproval === 1,
        receiverApproval: escrow.inner.value.receiverApproval === 1,
        releaseTime: escrow.inner.value.releaseTime,
        released: escrow.inner.value.released === 1,
        amount: escrow.inner.value.amount,
        mint: escrow.inner.value.mint,
        tokenProgram: ParsePaymentRuleTokenProgram(escrow.inner.value.tokenProgram),
        escrow: escrow.inner.value.escrow as Escrow
    }
}