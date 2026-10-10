export type ModelChoice = "auto" | "gemini" | "openai";

// Google currently exposes Gemini 3.8 Flash to new API users. Keeping this in
// one place lets the agent catalog and the provider adapter evolve together.
export const defaultGeminiModel = "gemini-3.8-flash";

export const modelOptions = [
  { id: "auto", label: "Auto", description: "Le modèle défini par l’agent" },
  { id: "gemini", label: "Gemini", description: "Rapide et économique" },
  { id: "openai", label: "OpenAI", description: "Disponible si la clé est configurée" },
] as const;

export function normalizeModelChoice(value: unknown): ModelChoice {
  return value === "gemini" || value === "openai" ? value : "auto";
}
