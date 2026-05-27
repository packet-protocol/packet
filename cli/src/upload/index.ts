import type { Command } from "commander";
import { registerUploadFileCommand } from "./file.js";
import { registerUploadRawCommand } from "./raw.js";

export const CommandUpload = async (parent: Command) => {
  registerUploadRawCommand(parent);
  registerUploadFileCommand(parent);
};
