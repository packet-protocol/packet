import { PublicKey } from "@solana/web3.js";
import {
  CPI_AUTHORITY_SEED,
} from "@lightprotocol/compressed-token";
import { LIGHT_TOKEN_PROGRAM_ID } from "@lightprotocol/stateless.js";


export const LIGHT_TOKEN_CPI_AUTHORITY = PublicKey.findProgramAddressSync(
  [CPI_AUTHORITY_SEED],
  LIGHT_TOKEN_PROGRAM_ID,
)[0];