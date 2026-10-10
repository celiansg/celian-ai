import type { AgentId } from "../types";

const routes: Array<{ agent: AgentId; keywords: string[] }> = [
  { agent: "prod", keywords: ["bat", "impression", "grammage", "papier", "support", "finition", "faconnage", "production", "decoupe", "perforation", "pliage", "pelliculage", "marquage", "prepress", "fabrication"] },
  { agent: "client", keywords: ["mail", "email", "client", "relance", "reponse", "fournisseur", "validation"] },
  { agent: "design", keywords: ["design", "graphisme", "visuel", "catalogue", "affiche", "mockup", "direction artistique", "mise en page", "typographie"] },
  { agent: "dev", keywords: ["code", "developpement", "bug", "api", "site", "application", "ux", "ui", "architecture", "firebase", "vercel", "codex"] },
  { agent: "business", keywords: ["prix", "marge", "cout", "marche", "business", "rentabilite", "strategie", "acquisition", "mvp"] },
  { agent: "bts", keywords: ["cours", "revision", "quiz", "bts", "erpc", "exercice", "notion", "apprendre"] },
];

export function routeGoal(goal: string, explicitAgent?: AgentId): AgentId[] {
  if (explicitAgent) return [explicitAgent];
  const normalized = goal.toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const matches = routes.filter((route) => route.keywords.some((keyword) => normalized.includes(keyword))).map((route) => route.agent);
  return matches.length ? ["celian", ...Array.from(new Set(matches))] : ["celian"];
}
