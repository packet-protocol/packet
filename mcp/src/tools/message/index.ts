import type { PacketMcpConfig } from "../../config/types.js";
import { ToolsEscrow } from "./escrow.js";
import { ToolsEvents } from "./events.js";
import { ToolsInbox } from "./inbox.js";
import { ToolsRead } from "./read.js";
import { ToolsSend } from "./send.js";
import { ToolsWatch } from "./watch.js";

export const ToolsMessage = (config: PacketMcpConfig) => [
    ...ToolsSend(config),
    ...ToolsInbox(config),
    ...ToolsRead(config),
    ...ToolsWatch(config),
    ...ToolsEvents(config),
    ...ToolsEscrow(config),
] as const;
