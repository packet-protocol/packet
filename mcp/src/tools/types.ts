import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp";
import type {
  AnySchema,
  ZodRawShapeCompat,
} from "@modelcontextprotocol/sdk/server/zod-compat";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/spec.types";

export type ToolConfig<
  InputArgs extends undefined | ZodRawShapeCompat | AnySchema = undefined,
  OutputArgs extends ZodRawShapeCompat | AnySchema | undefined = undefined,
> = {
  title?: string;
  description?: string;
  inputSchema?: InputArgs;
  outputSchema?: OutputArgs;
  annotations?: ToolAnnotations;
  _meta?: Record<string, unknown>;
};

export type Tool<
  InputArgs extends undefined | ZodRawShapeCompat | AnySchema = undefined,
  OutputArgs extends ZodRawShapeCompat | AnySchema | undefined = undefined,
> = {
  name: string;
  config: ToolConfig<InputArgs, OutputArgs>;
  cb: ToolCallback<InputArgs>;
};

export const defineTool = <
  const InputArgs extends undefined | ZodRawShapeCompat | AnySchema = undefined,
  const OutputArgs extends ZodRawShapeCompat | AnySchema | undefined = undefined,
>(tool: Tool<InputArgs, OutputArgs>) => tool;