import type { AgentContext, ToolPermission } from "../types";

export interface ToolDefinition {
  name: string;
  description: string;
  permission: ToolPermission;
  inputSchema: Record<string, string>;
  execute: (input: Record<string, unknown>, context: AgentContext) => Promise<Record<string, unknown>>;
}

type WorkspaceContext = {
  projects?: Array<Record<string, unknown>>;
  tasks?: Array<Record<string, unknown>>;
  files?: Array<Record<string, unknown>>;
  activities?: Array<Record<string, unknown>>;
};

function getWorkspaceContext(context: AgentContext): WorkspaceContext | undefined {
  const value = context.facts?.workspaceContext;
  if (!value || typeof value !== "object") return undefined;
  return value as WorkspaceContext;
}

export const tools: ToolDefinition[] = [
  {
    name: "getProject",
    description: "Récupère le contexte d’un projet.",
    permission: "read",
    inputSchema: { projectId: "string" },
    execute: async (input, context) => {
      const workspace = getWorkspaceContext(context);
      const projectId = typeof input.projectId === "string" ? input.projectId : context.projectId;
      const project = workspace?.projects?.find((item) => item.id === projectId) ?? null;
      return {
        projectId: projectId ?? null,
        project,
        status: project ? "available" : workspace ? "not_found" : "not_connected",
        message: project
          ? "Contexte projet chargé depuis les métadonnées transmises."
          : workspace
            ? "Aucun projet correspondant dans le contexte transmis."
            : "Le repository projet n’est pas connecté à cette exécution.",
      };
    },
  },
  {
    name: "getTasks",
    description: "Récupère les tâches ouvertes de l’espace.",
    permission: "read",
    inputSchema: { scope: "today|project|all", projectId: "string?" },
    execute: async (input, context) => {
      const workspace = getWorkspaceContext(context);
      const scope = typeof input.scope === "string" ? input.scope : "today";
      const tasks = (workspace?.tasks ?? []).filter((task) => {
        if (scope === "all") return true;
        if (scope === "project") return Boolean(context.projectId && task.projectId === context.projectId);
        if (typeof task.dueAt !== "string") return false;
        return new Date(task.dueAt).toDateString() === new Date().toDateString();
      });
      return {
        count: tasks.length,
        tasks,
        status: workspace ? "available" : "not_connected",
        message: workspace
          ? "Tâches lues depuis le contexte transmis."
          : "Le repository tâche n’est pas connecté à cette exécution.",
      };
    },
  },
  {
    name: "createTask",
    description: "Crée une tâche dans un projet.",
    permission: "write",
    inputSchema: { title: "string", projectId: "string?" },
    execute: async (input, context) => ({
      title: input.title,
      projectId: context.projectId ?? null,
      status: "not_persisted",
      message: "La tâche a été préparée, mais aucune écriture n’est effectuée sans repository authentifié.",
    }),
  },
  {
    name: "listFiles",
    description: "Liste les fichiers accessibles d’un projet.",
    permission: "read",
    inputSchema: { projectId: "string?" },
    execute: async (input, context) => {
      const workspace = getWorkspaceContext(context);
      const files = (workspace?.files ?? []).filter((file) => !input.projectId || file.projectId === input.projectId);
      return {
        files,
        count: files.length,
        status: workspace ? "available" : "not_connected",
        message: workspace
          ? "Métadonnées de fichiers lues depuis le contexte transmis."
          : "Le repository fichier n’est pas connecté à cette exécution.",
      };
    },
  },
  {
    name: "readSupportedFile",
    description: "Lit le contenu textuel d’un fichier supporté.",
    permission: "read",
    inputSchema: { fileId: "string" },
    execute: async (input) => ({
      fileId: input.fileId,
      status: "not_connected",
      message: "Le contenu binaire n’est pas disponible dans le runner serveur sans fichier explicitement joint.",
    }),
  },
  {
    name: "createActivity",
    description: "Ajoute une trace lisible dans l’activité du projet.",
    permission: "write",
    inputSchema: { description: "string", projectId: "string?" },
    execute: async (input, context) => ({
      description: input.description,
      projectId: context.projectId ?? null,
      status: "not_persisted",
      message: "L’activité a été préparée, mais aucune écriture n’est effectuée sans repository authentifié.",
    }),
  },
  {
    name: "getRecentActivity",
    description: "Récupère les événements récents utiles au contexte.",
    permission: "read",
    inputSchema: { limit: "number?" },
    execute: async (input, context) => {
      const workspace = getWorkspaceContext(context);
      const limit = typeof input.limit === "number" ? Math.max(1, Math.min(input.limit, 20)) : 5;
      const activities = (workspace?.activities ?? []).slice(0, limit);
      return {
        activities,
        count: activities.length,
        status: workspace ? "available" : "not_connected",
        message: workspace
          ? "Activités lues depuis le contexte transmis."
          : "Le repository activité n’est pas connecté à cette exécution.",
      };
    },
  },
];

export function getTool(name: string) {
  return tools.find((tool) => tool.name === name);
}
