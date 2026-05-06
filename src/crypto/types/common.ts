import type { Bytes } from "../../types/common";

export type BodyEncoding = "base64" | "utf8";

export type PacketKeyPair = {
  privateKey: Bytes;
  publicKey: Bytes;
};


export type HashValue = string;
