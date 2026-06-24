import type { Bytes } from "../../types/common.js";

export type BodyEncoding = "base64" | "utf8";

export type PacketKeyPair = {
  privateKey: Bytes;
  publicKey: Bytes;
};


export type HashValue = string;
