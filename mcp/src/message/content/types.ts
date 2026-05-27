import type { Keypair } from "@solana/web3.js";
import type {
  BodyEncoding,
  PacketClient,
  PacketMessageContentKind,
  PacketMessageContentSource,
  PacketSendContentType,
} from "xpkt-sdk";
import { MessageType } from "xpkt-sdk";
import type { PacketMcpConfig } from "../../config/types.js";

export type SendInputSource = "content" | "url" | "envelope";
export type SendContentType = PacketSendContentType;
export type ResolvedSendContentType = PacketMessageContentKind;

export type PrepareContentOptions = {
  keypair: Keypair;
  config: PacketMcpConfig["config"];
  client: PacketClient;
  source: SendInputSource;
  content: string;
  subject?: string;
  raw?: boolean;
  encrypt?: boolean;
  upload?: boolean;
  readers?: any[];
  contentType?: string;
  ignoreWarnings?: boolean;
  bodyEncoding?: BodyEncoding;
  bodyContentType?: string;
  byteLength?: number;
};

export type PreparedMessageContent = {
  messageType: MessageType;
  content: string;
  finalContentType: ResolvedSendContentType;
  uploaded?: { id: string; url: string; bytes: number; usedFreeWallet: boolean };
  encrypted: boolean;
  source: PacketMessageContentSource | "envelope" | "uploaded-irys";
};
