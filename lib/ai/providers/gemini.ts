import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import type { AIProvider, GenerateRequest, GenerateResponse } from "../types";
import { defaultGeminiModel } from "../models";

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
      maxRetries: 0,
    });
    return { text: result.text };
  }
}
