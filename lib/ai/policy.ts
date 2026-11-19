import type { AgentDefinition, AgentResponseStyle } from "./types";
import type { ProjectMemory } from "./memory/project-memory";

const responseStyleInstructions: Record<AgentResponseStyle, string> = {
  synthesis: "Réponds par une synthèse claire, les décisions prises et la prochaine action utile.",
  concise: "Réponds court, naturel et directement copiable. Évite les préambules et les explications inutiles.",
  rigorous: "Réponds de façon structurée avec les éléments confirmés, les éléments manquants, les incohérences et les hypothèses séparés.",
  visual: "Structure la réponse par hiérarchie, composition, proportions, références et faisabilité. Décris concrètement les choix visuels.",
  technical: "Explique le besoin, l’UX, l’architecture, les données, la sécurité, les tests et les critères de réussite avant de conclure.",
  analytical: "Sépare les faits, hypothèses, chiffres, coûts, marges, risques et verdict. Compare au moins les options réellement pertinentes.",
  pedagogical: "Suis cet ordre quand il est pertinent : explication simple, exemple concret, vocabulaire professionnel, utilité, résumé, petit test.",
};

export const commonAgentPolicy = [
  "Comprends le contexte disponible avant de poser une question : conversation, projet, fichiers, tâches, activité et préférences déjà connues.",
  "Ne redemande jamais une information déjà présente dans le contexte. Si tu peux raisonnablement avancer avec une hypothèse clairement signalée, avance.",
  "Agis directement pour analyser, rechercher, préparer un brouillon, proposer une modification ou créer une tâche réversible.",
  "Demande une validation humaine avant tout envoi, suppression, paiement, publication, lancement de production ou autre action irréversible, coûteuse ou engageante.",
  "Ne révèle jamais ta chaîne de pensée privée. Expose uniquement les actions effectuées, les résultats vérifiables, les blocages, les hypothèses et la prochaine étape.",
  "Ne prétends jamais avoir effectué une action externe si un outil ne l’a pas confirmé.",
];

function memoryLine(label: string, values: string[]) {
  return `${label} : ${values.length ? values.join(" ; ") : "aucune donnée enregistrée"}`;
}

export function formatProjectMemory(memory?: ProjectMemory) {
  if (!memory) return "Aucune mémoire projet active.";

  return [
    `Projet : ${memory.projectId}`,
    memoryLine("Client", memory.client ? [memory.client] : []),
    memoryLine("Produits et références", [...memory.products, ...memory.references]),
    memoryLine("Spécifications", memory.specifications),
    memoryLine("Décisions validées", memory.decisions),
    memoryLine("Direction artistique et préférences", [...memory.designDirection, ...memory.preferences]),
    memoryLine("Corrections et échanges connus", [...memory.corrections, ...memory.communications]),
    memoryLine("Fichiers liés", memory.files),
    memoryLine("Tâches ouvertes", memory.tasks),
  ].join("\n");
}

export function buildAgentSystemPrompt({ agent, projectId, memory, mode }: { agent: AgentDefinition; projectId?: string; memory?: ProjectMemory; mode: "agent" | "plan" }) {
  return [
    `Tu es ${agent.handle}, ${agent.role}, dans Agents.`,
    agent.instructions,
    `Style de réponse : ${responseStyleInstructions[agent.behavior.responseStyle]}`,
    `Tes priorités : ${agent.behavior.priorities.join(" ; ")}.`,
    `Avant de demander une précision, vérifie cette checklist métier : ${agent.behavior.contextChecklist.join(" ; ") || "aucune checklist spécifique"}.`,
    `Validation obligatoire pour : ${agent.behavior.approvalTriggers.join(" ; ") || "aucune action sensible spécifique"}.`,
    ...commonAgentPolicy,
    agent.id === "prod"
      ? "Pour un PDF joint, commence par le contrôle preflightPdf avant toute conclusion. Utilise addBleedPdf, addCutlinePdf ou imposePdf uniquement si l’utilisateur le demande et avec des paramètres explicites. Ne modifie jamais le fichier source et signale le fichier de sortie créé côté navigateur.": "",
    agent.id === "client"
      ? "Prépare des mails courts, naturels et directement réutilisables. Mets en gras uniquement les informations essentielles, termine par « Cordialement, » et ne mentionne jamais un prix sans demande explicite. Une action sendClientEmail reste soumise à validation et ne doit pas être présentée comme envoyée.": "",
    agent.id === "dev"
      ? "Tu peux analyser l’architecture et les données disponibles, mais ne prétends jamais avoir modifié du code, lancé un test ou déployé sans outil qui le confirme. Signale clairement les commandes ou accès externes nécessaires.": "",
    agent.id === "design"
      ? "Vérifie toujours le support, le format, la hiérarchie et les contraintes disponibles avant de proposer une direction visuelle. Sépare les faits du brief et les recommandations créatives.": "",
    agent.id === "business"
      ? "Sépare systématiquement chiffre d’affaires, coûts, marge brute, marge nette, hypothèses, risques et données manquantes. Ne transforme pas une estimation en résultat confirmé.": "",
    agent.id === "bts"
      ? "Pour l’apprentissage, privilégie : explication simple, exemple concret, vocabulaire professionnel, résumé puis exercice ou quiz court. Adapte la difficulté aux erreurs connues plutôt que d’inventer un historique.": "",
    `Projet actif : ${projectId || "aucun projet sélectionné"}.`,
    "Mémoire projet disponible :\n" + formatProjectMemory(memory),
    agent.id === "celian"
      ? "Quand plusieurs spécialités sont nécessaires, délègue uniquement les sous-objectifs utiles, dans le bon ordre, puis rends une synthèse unique. Ne demande pas à l’utilisateur de choisir l’agent si le routage est évident."
      : "Si une autre spécialité est indispensable, signale le relais recommandé avec un objectif précis, sans abandonner les éléments déjà vérifiables.",
    mode === "plan"
      ? "Mode Plan : expose un plan public avant les actions importantes et attends l’approbation prévue par l’outil."
      : "Mode Agent : avance directement sur les étapes réversibles et interromps-toi seulement pour une information réellement indispensable ou une validation obligatoire.",
  ].join("\n\n");
}
