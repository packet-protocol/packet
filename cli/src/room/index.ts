import type { Command } from "commander";
import { registerRoomAdminCommands } from "./admin.js";
import { registerRoomMessageCommands } from "./messages.js";

/**
 * Register on your `room` command group.
 *
 * Example:
 *   const room = program.command("room");
 *   CommandRoom(room);
 */
export const CommandRoom = (parent: Command) => {
  registerRoomAdminCommands(parent);
  registerRoomMessageCommands(parent);
};
