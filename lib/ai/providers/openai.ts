import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { AIProvider, GenerateRequest, GenerateResponse } from "../types";
import { createProviderTools } from "./tool-adapter";

export class OpenAIProvider implements AIProvider {
  readonly id = "openai" as const;

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI n’est pas configuré sur cet environnement.");
    const openai = createOpenAI({ apiKey });
    const result = await generateText({
      model: openai(process.env.OPENAI_MODEL || "gpt-4.1-mini"),
      system: request.system,
      prompt: request.prompt,
      tools: request.toolDefinitions?.length ? createProviderTools(request.toolDefinitions, request.toolContext) : undefined,
      maxRetries: 0,
    });
    const toolCall = result.toolCalls?.[0] as { toolName?: string; input?: unknown } | undefined;
    const toolResults = (result.toolResults ?? []) as Array<{ toolName?: string; output?: unknown }>;
    return {
      text: result.text,
      toolCall: toolCall?.toolName ? { name: toolCall.toolName, input: (toolCall.input ?? {}) as Record<string, unknown> } : undefined,
      toolResults: toolResults.map((item) => ({ name: item.toolName ?? "outil", result: (item.output ?? {}) as Record<string, unknown> })),
    };
  }
}
