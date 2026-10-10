export type ModelChoice = "auto" | "gemini" | "openai";

// Keep the default centralized so every agent uses the same low-latency model.
// Gemini 3.5 Flash-Lite is stable and designed for high-throughput subagent work.
export const defaultGeminiModel = "gemini-3.5-flash-lite";

export const modelOptions = [
  { id: "auto", label: "Auto", description: "Le modèle défini par l’agent" },
  { id: "gemini", label: "Gemini", description: "Rapide et économique" },
  { id: "openai", label: "OpenAI", description: "Disponible si la clé est configurée" },
] as const;

export function normalizeModelChoice(value: unknown): ModelChoice {
  return value === "gemini" || value === "openai" ? value : "auto";
}
