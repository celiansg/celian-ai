export type ModelChoice = "auto" | "gemini" | "openai";

// Keep the default centralized so every agent uses the same low-latency model.
// Override with GEMINI_MODEL when Google exposes a newer model in the account.
// Gemini reports that 2.5 Flash Lite is unavailable to new users; 3.5 is the
// current lightweight model accepted by the configured API key.
export const defaultGeminiModel = "gemini-3.5-flash-lite";

export const modelOptions = [
  { id: "auto", label: "Auto", description: "Le modèle défini par l’agent" },
  { id: "gemini", label: "Gemini", description: "Rapide et économique" },
  { id: "openai", label: "OpenAI", description: "Disponible si la clé est configurée" },
] as const;

export function normalizeModelChoice(value: unknown): ModelChoice {
  return value === "gemini" || value === "openai" ? value : "auto";
}
