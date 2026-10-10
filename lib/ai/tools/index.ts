import type { ToolPermission } from "../types";

export interface ToolDefinition {
  name: string;
  description: string;
  permission: ToolPermission;
  inputSchema: Record<string, string>;
  execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

const now = () => new Date().toISOString();

export const tools: ToolDefinition[] = [
  {
    name: "getProject",
    description: "Récupère le contexte d’un projet.",
    permission: "read",
    inputSchema: { projectId: "string" },
    execute: async (input) => ({ projectId: input.projectId ?? null, status: "not_found", message: "Aucun projet trouvé." }),
  },
  {
    name: "getTasks",
    description: "Récupère les tâches ouvertes de l’espace.",
    permission: "read",
    inputSchema: { projectId: "string?" },
    execute: async () => ({ count: 0, tasks: [] }),
  },
  {
    name: "createTask",
    description: "Crée une tâche dans un projet.",
    permission: "write",
    inputSchema: { title: "string", projectId: "string?" },
    execute: async (input) => ({ id: crypto.randomUUID(), title: input.title, createdAt: now() }),
  },
  {
    name: "listFiles",
    description: "Liste les fichiers accessibles d’un projet.",
    permission: "read",
    inputSchema: { projectId: "string?" },
    execute: async () => ({ files: [], count: 0 }),
  },
  {
    name: "readSupportedFile",
    description: "Lit le contenu textuel d’un fichier supporté.",
    permission: "read",
    inputSchema: { fileId: "string" },
    execute: async (input) => ({ fileId: input.fileId, extractedText: "Contenu prêt à être analysé." }),
  },
  {
    name: "createActivity",
    description: "Ajoute une trace lisible dans l’activité du projet.",
    permission: "write",
    inputSchema: { description: "string", projectId: "string?" },
    execute: async (input) => ({ id: crypto.randomUUID(), description: input.description, createdAt: now() }),
  },
  {
    name: "getRecentActivity",
    description: "Récupère les événements récents utiles au contexte.",
    permission: "read",
    inputSchema: { limit: "number?" },
    execute: async () => ({ activities: [], count: 0 }),
  },
];

export function getTool(name: string) {
  return tools.find((tool) => tool.name === name);
}
