import type { Provider } from "./types";

export const defaultProvider: Provider = "gemini";
export const agentMaxSteps = 8;

export function resolveProvider(preference: "auto" | Provider): Provider {
  if (preference !== "auto") return preference;
  return process.env.GEMINI_API_KEY ? "gemini" : "gemini";
}
