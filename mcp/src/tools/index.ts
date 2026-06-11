import type { PacketMcpConfig } from "../config/types.js";
import { ToolsCrypto } from "./crypto/index.js";
import { ToolsMessage } from "./message/index.js";
import { ToolsRoom } from "./room/index.js";
import { ToolsUpload } from "./upload/index.js";

export const Tools = (config: PacketMcpConfig) => [
  ...ToolsCrypto(config),
  ...ToolsUpload(config),
  ...ToolsMessage(config),
  ...ToolsRoom(config),
] as const;
