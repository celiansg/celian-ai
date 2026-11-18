import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { AIProvider, GenerateRequest, GenerateResponse } from "../types";

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
      maxRetries: 0,
    });
    return { text: result.text };
  }
}
