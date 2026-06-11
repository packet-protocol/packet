import { PublicKey } from "@solana/web3.js";
import { TokenProgramType } from "./entities/payment/types";
import { BN } from "bn.js";

export const SEEDS = {
  user: "user",
  inbox: "inbox",
  inboxBody: "inbox_body",
  inboxMetadata: "inbox-metadata",
  inboxArchive: "inbox_archive",
  thread: "thread",
  message: "msg",
  vault: "packet_vault",
  key: "key",
  room: "room",
} as const;

export const PACKET_PROGRAM_ADDRESS = "A3YNvikE96zn2PYrbqRa8hheH99ks7qt22zQiUF8Ttao";
export const PACKET_PROGRAM_ID = new PublicKey(PACKET_PROGRAM_ADDRESS);
export type PACKET_PROGRAM_ID = typeof PACKET_PROGRAM_ADDRESS;

export const PACKET_LOOK_UP_TABLE = new PublicKey("CxLU3QQAntcTdvyJCwVawT7rKMy1Gu6HsPEjju6qLVNc");
export const PACKET_LOOK_UP_TABLE_DEVNET = new PublicKey("VfPSYLZfDKDbyzGHk6h7PWVqtAFZmEvt164by21wP1U");

export const WSOL_ID = new PublicKey("So11111111111111111111111111111111111111112");
export const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

export const TokenProgramTypeToProgramId = {
    [TokenProgramType.TokenProgram]: TOKEN_PROGRAM_ID,
    [TokenProgramType.Token2022Program]: TOKEN_2022_PROGRAM_ID
} as const;

export const NO_INBOX = new BN("18446744073709551615");