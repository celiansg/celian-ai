export type ModelChoice = "auto" | "gemini" | "openai";

export const modelOptions = [
  { id: "auto", label: "Auto", description: "Le modèle défini par l’agent" },
  { id: "gemini", label: "Gemini", description: "Rapide et économique" },
  { id: "openai", label: "OpenAI", description: "Disponible si la clé est configurée" },
] as const;

export function normalizeModelChoice(value: unknown): ModelChoice {
  return value === "gemini" || value === "openai" ? value : "auto";
}
