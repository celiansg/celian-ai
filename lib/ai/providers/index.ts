import type { AIProvider, Provider } from "../types";
import { MockProvider } from "./mock";

export function getAIProvider(provider: Provider): AIProvider {
  // The provider boundary is server-only. Real Gemini/OpenAI adapters can replace this mock
  // without changing agents, tools, or the runner contract.
  if (provider === "gemini") return new MockProvider();
  return new MockProvider();
}
