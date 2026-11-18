import type { AIProvider, Provider } from "../types";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";

export function getAIProvider(provider: Provider): AIProvider {
  if (provider === "gemini") return new GeminiProvider();
  return new OpenAIProvider();
}
