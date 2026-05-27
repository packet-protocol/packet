import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, WSOL_ID } from "xpkt-sdk";
import { parseOptionalPublicKey, parseSolToLamportsBN } from "../input/index.js";

export type PaymentOptions = {
  paymentSol?: string;
  paymentTo?: string;
  paymentToRaw?: boolean;
};

export type InboxPaymentOptions = PaymentOptions & {
  escrow?: boolean;
};

export const buildWsolPayment = (options: PaymentOptions, defaultReceiverOwner: PublicKey): any | undefined => {
  if (!options.paymentSol) return undefined;

  const amount = parseSolToLamportsBN(options.paymentSol);
  const paymentTo = parseOptionalPublicKey(options.paymentTo, "paymentTo");

  return {
    amount,
    mint: WSOL_ID,
    to: options.paymentToRaw
      ? { type: "raw", address: paymentTo ?? defaultReceiverOwner }
      : { type: "ata", owner: paymentTo ?? defaultReceiverOwner },
    tokenProgram: TOKEN_PROGRAM_ID,
  };
};

export const buildInboxWsolPaymentRule = (options: InboxPaymentOptions, defaultReceiverOwner: PublicKey): any | undefined => {
  if (!options.paymentSol) {
    if (options.escrow) throw new Error("escrow requires paymentSol on inbox creation");
    return undefined;
  }

  const amount = parseSolToLamportsBN(options.paymentSol);
  const paymentTo = parseOptionalPublicKey(options.paymentTo, "paymentTo");

  return {
    amount,
    mint: WSOL_ID,
    to: options.paymentToRaw
      ? { type: "raw", address: paymentTo ?? defaultReceiverOwner }
      : { type: "ata", owner: paymentTo ?? defaultReceiverOwner },
    tokenProgram: TOKEN_PROGRAM_ID,
    escrowEnabled: options.escrow === true,
  };
};
