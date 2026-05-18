import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, WSOL_ID } from "xpkt-sdk";
import { parseOptionalPublicKey, parseSolToLamportsBN } from "./parse.js";

export type PaymentCliOptions = {
  paymentSol?: string;
  paymentTo?: string;
  paymentToRaw?: boolean;
};

export type InboxPaymentCliOptions = PaymentCliOptions & {
  escrow?: boolean;
};

export function buildWsolPayment(options: PaymentCliOptions, defaultReceiverOwner: PublicKey): any | undefined {
  if (!options.paymentSol) return undefined;

  const amount = parseSolToLamportsBN(options.paymentSol);
  const paymentTo = parseOptionalPublicKey(options.paymentTo, "--payment-to");

  return {
    amount,
    mint: WSOL_ID,
    to: options.paymentToRaw
      ? { type: "raw", address: paymentTo ?? defaultReceiverOwner }
      : { type: "ata", owner: paymentTo ?? defaultReceiverOwner },
    tokenProgram: TOKEN_PROGRAM_ID,
  };
}

export function buildInboxWsolPaymentRule(options: InboxPaymentCliOptions, defaultReceiverOwner: PublicKey): any | undefined {
  if (!options.paymentSol) {
    if (options.escrow) throw new Error("--escrow requires --payment-sol on inbox creation");
    return undefined;
  }

  const amount = parseSolToLamportsBN(options.paymentSol);
  const paymentTo = parseOptionalPublicKey(options.paymentTo, "--payment-to");

  return {
    amount,
    mint: WSOL_ID,
    to: options.paymentToRaw
      ? { type: "raw", address: paymentTo ?? defaultReceiverOwner }
      : { type: "ata", owner: paymentTo ?? defaultReceiverOwner },
    tokenProgram: TOKEN_PROGRAM_ID,
    escrowEnabled: options.escrow === true,
  };
}
