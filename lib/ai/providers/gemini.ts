import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import type { AIProvider, GenerateRequest, GenerateResponse } from "../types";
import { defaultGeminiModel } from "../models";
import { createProviderTools } from "./tool-adapter";

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Gemini n’est pas configuré sur cet environnement.");
  return createGoogleGenerativeAI({ apiKey })(process.env.GEMINI_MODEL || defaultGeminiModel);
}

export class GeminiProvider implements AIProvider {
  readonly id = "gemini" as const;

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const result = await generateText({
      model: getGeminiModel(),
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
