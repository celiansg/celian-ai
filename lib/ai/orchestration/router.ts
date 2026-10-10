import type { AgentId } from "../types";

const routes: Array<{ agent: AgentId; keywords: string[] }> = [
  { agent: "prod", keywords: ["bat", "impression", "grammage", "façonnage", "production", "découpe"] },
  { agent: "client", keywords: ["mail", "client", "relance", "réponse", "fournisseur"] },
  { agent: "design", keywords: ["design", "graphisme", "visuel", "catalogue", "affiche", "mockup"] },
  { agent: "dev", keywords: ["code", "développement", "bug", "api", "site", "application"] },
  { agent: "business", keywords: ["prix", "marge", "marché", "business", "rentabilité", "stratégie"] },
  { agent: "bts", keywords: ["cours", "révision", "quiz", "bts", "erpc", "exercice"] },
];

export function routeGoal(goal: string, explicitAgent?: AgentId): AgentId[] {
  if (explicitAgent) return [explicitAgent];
  const normalized = goal.toLowerCase();
  const matches = routes.filter((route) => route.keywords.some((keyword) => normalized.includes(keyword))).map((route) => route.agent);
  return matches.length ? ["celian", ...Array.from(new Set(matches))] : ["celian"];
}
