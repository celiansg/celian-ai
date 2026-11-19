import { tool } from "ai";
import { z } from "zod";
import type { AgentContext, ToolPermission } from "../types";

type ProviderToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, string>;
  permission: ToolPermission;
  execute: (input: Record<string, unknown>, context: AgentContext) => Promise<Record<string, unknown>>;
};

function fieldSchema(description: string) {
  const normalized = description.trim();
  const optional = normalized.endsWith("?");
  const base = normalized.replace(/\?$/, "");
  let schema: z.ZodTypeAny = base.startsWith("number") ? z.number() : base.startsWith("boolean") ? z.boolean() : z.string();
  if (optional) schema = schema.optional();
  return schema;
}

function inputSchema(fields: Record<string, string>) {
  return z.object(Object.fromEntries(Object.entries(fields).map(([name, description]) => [name, fieldSchema(description)])));
}

export function createProviderTools(definitions: ProviderToolDefinition[], context?: AgentContext) {
  const toolContext = context ?? { userId: "unknown" };
  return Object.fromEntries(definitions.map((definition) => [definition.name, tool({
    description: `${definition.description} Permission : ${definition.permission}.`,
    inputSchema: inputSchema(definition.inputSchema),
    execute: async (input) => definition.execute(input as Record<string, unknown>, toolContext),
  })]));
}
