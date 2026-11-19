import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getAgent } from "@/lib/ai/agents";
import type { AgentId } from "@/lib/ai/types";
import { agentMaxSteps } from "@/lib/ai/config";
import { buildAgentSystemPrompt } from "@/lib/ai/policy";
import { getProjectMemory } from "@/lib/ai/memory/project-memory";
import { defaultGeminiModel, normalizeModelChoice } from "@/lib/ai/models";
import { runAgent } from "@/lib/ai/orchestration/runner";
import { workspaceTaskInputSchema, workspaceTaskOutputSchema } from "@/lib/ai/workspace-task";
import { aiAuthError, authenticateAiRequest } from "@/lib/firebase/server-auth";

const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).default([]),
  agentId: z.string().optional(),
  mode: z.enum(["agent", "plan"]).default("agent"),
  model: z.unknown().optional(),
  projectId: z.string().optional(),
  workspaceContext: z.object({
    projects: z.array(z.object({ id: z.string(), name: z.string(), description: z.string(), status: z.string(), progress: z.number() })).default([]),
    tasks: z.array(z.object({ id: z.string(), title: z.string(), status: z.string(), priority: z.string(), projectId: z.string().optional(), assignedAgentId: z.string().optional(), dueAt: z.string().optional() })).default([]),
    files: z.array(z.object({ id: z.string(), name: z.string(), mimeType: z.string(), size: z.number(), kind: z.string(), projectId: z.string().optional() })).default([]),
    activities: z.array(z.object({ id: z.string(), description: z.string(), agentId: z.string(), projectId: z.string().optional(), createdAt: z.string() })).default([]),
  }).optional(),
});

const agentIdSchema = z.enum([
  "celian",
  "prod",
  "client",
  "design",
  "dev",
  "business",
  "bts",
]);

const questionAnswerSchema = z.object({
  kind: z.enum(["single", "multi", "text", "skip"]),
  selectedIds: z.array(z.string()).optional(),
  text: z.string().optional(),
});

function getProvider(choice: ReturnType<typeof normalizeModelChoice>, agentModel: string) {
  if (choice === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI n’est pas configuré sur cet environnement.");
    }
    return createOpenAI({ apiKey })("gpt-4.1-mini");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini n’est pas configuré sur cet environnement.");
  }

  const google = createGoogleGenerativeAI({ apiKey });
  return google(choice === "gemini" ? defaultGeminiModel : agentModel || defaultGeminiModel);
}

function createWorkspaceTools(agentId: AgentId, userId: string, projectId: string | undefined, projectMemory?: Awaited<ReturnType<typeof getProjectMemory>>, workspaceContext?: z.infer<typeof chatRequestSchema>['workspaceContext']) {
  const allTools = {
    searchWorkspaceProjects: tool({
      description: "Recherche un projet visible par nom pour retrouver son identifiant avant de créer une tâche liée.",
      inputSchema: z.object({ query: z.string().trim().min(1).max(120) }),
      execute: async ({ query }) => ({
        status: workspaceContext ? "available" : "not_connected",
        projects: (workspaceContext?.projects ?? [])
          .filter(({ name }) => name.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")))
          .slice(0, 10)
          .map(({ id, name }) => ({ id, name })),
      }),
    }),
    getProjectContext: tool({
      description: "Récupère le contexte structuré du projet actif.",
      inputSchema: z.object({
        requestedProjectId: z.string().optional().describe("Identifiant du projet si différent du projet actif"),
      }),
      execute: async ({ requestedProjectId }) => ({
        projectId: requestedProjectId && requestedProjectId !== projectId ? null : requestedProjectId ?? projectId ?? null,
        status: requestedProjectId && requestedProjectId !== projectId ? "not_available_in_this_conversation" : requestedProjectId ?? projectId ? "available" : "not_selected",
        memory: requestedProjectId && requestedProjectId !== projectId ? null : projectMemory ?? null,
        project: requestedProjectId && requestedProjectId !== projectId
          ? null
          : workspaceContext?.projects.find((item) => item.id === projectId) ?? null,
        message: requestedProjectId && requestedProjectId !== projectId
          ? "Ce projet n’est pas associé à cette conversation ; aucune donnée n’a été lue."
          : requestedProjectId ?? projectId ? "Contexte projet chargé." : "Aucun projet n’est encore associé à cette conversation.",
      }),
    }),

    listWorkspaceTasks: tool({
      description: "Liste les tâches ouvertes pertinentes pour l’objectif courant.",
      inputSchema: z.object({
        scope: z.enum(["today", "project", "all"]).default("today"),
      }),
      execute: async ({ scope }) => {
        const tasks = (workspaceContext?.tasks ?? []).filter((task) => {
          if (task.status === "completed" || task.status === "archived") return false;
          if (scope === "all") return true;
          if (scope === "project") return Boolean(projectId && task.projectId === projectId);
          if (!task.dueAt) return false;
          return new Date(task.dueAt).toDateString() === new Date().toDateString();
        });
        return { scope, tasks, count: tasks.length, status: workspaceContext ? "available" : "not_connected" };
      },
    }),

    searchWorkspaceFiles: tool({
      description: "Recherche les fichiers liés au projet dans l’espace de travail.",
      inputSchema: z.object({
        query: z.string().describe("Nom ou type de fichier recherché"),
      }),
      execute: async ({ query }) => ({
        query,
        files: (workspaceContext?.files ?? []).filter((file) => `${file.name} ${file.mimeType} ${file.kind}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())),
        count: workspaceContext?.files.filter((file) => `${file.name} ${file.mimeType} ${file.kind}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).length ?? 0,
        status: workspaceContext ? "available" : "not_connected",
        message: workspaceContext ? "Métadonnées locales transmises à cette exécution. Le contenu binaire reste local tant qu’il n’est pas joint au message." : "Les fichiers locaux du navigateur ne sont pas accessibles depuis le serveur sans synchronisation authentifiée.",
      }),
    }),

    createWorkspaceTask: tool({
      description: "Enregistre une tâche interne si l’utilisateur en a demandé la création. Utilise uniquement un identifiant de projet visible ou omets-le. Confirme la création uniquement si le résultat est created.",
      inputSchema: workspaceTaskInputSchema,
      outputSchema: workspaceTaskOutputSchema,
    }),

    createActivity: tool({
      description: "Ajoute une trace d’activité lisible dans le projet.",
      inputSchema: z.object({ description: z.string().min(2) }),
      execute: async ({ description }) => ({
        description,
        projectId,
        status: "not_persisted",
        message: "L’activité a été préparée mais n’a pas été enregistrée : la synchronisation authentifiée n’est pas active.",
      }),
    }),

    getRecentActivity: tool({
      description: "Récupère les activités récentes visibles dans le contexte courant.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(5) }),
      execute: async ({ limit }) => ({
        activities: (workspaceContext?.activities ?? []).slice(0, limit),
        count: workspaceContext?.activities.length ?? 0,
        status: workspaceContext ? "available" : "not_connected",
      }),
    }),

    Agent: tool({
      description: "Délègue un sous-objectif à un agent spécialisé et récupère un résumé exploitable.",
      inputSchema: z.object({
        agentId: agentIdSchema.describe("Agent spécialisé à appeler"),
        goal: z.string().min(5).describe("Objectif précis donné au sous-agent"),
      }),
      execute: async ({ agentId: delegatedAgentId, goal }) => {
        const result = await runAgent({
          agentId: delegatedAgentId,
          goal,
          context: {
            userId,
            projectId,
            facts: { workspaceContext },
          },
        });
        const delegatedAgent = getAgent(delegatedAgentId);
        return {
          agentId: delegatedAgent.id,
          agent: delegatedAgent.handle,
          status: result.status,
          summary: result.answer,
          events: result.events.map((event) => event.summary),
        };
      },
    }),

    PlanWrite: tool({
      description: "Propose un plan public avant une série d’actions importantes.",
      inputSchema: z.object({
        plan: z.object({
          id: z.string().optional(),
          title: z.string(),
          summary: z.string(),
        }),
      }),
      execute: async ({ plan }) => ({
        approved: true,
        plan,
        status: "plan_approved",
      }),
    }),

    Question: tool({
      description: "Demande une information indispensable à l’utilisateur avant de poursuivre.",
      inputSchema: z.object({
        questions: z.array(
          z.object({
            kind: z.enum(["single", "multi", "text"]),
            title: z.string(),
            description: z.string().optional(),
            options: z.array(z.object({ id: z.string(), label: z.string(), description: z.string().optional() })).optional(),
            allowCustom: z.boolean().optional(),
            customPlaceholder: z.string().optional(),
            placeholder: z.string().optional(),
          }),
        ).min(1),
        totalQuestions: z.number().optional(),
      }),
      outputSchema: z.object({ answer: questionAnswerSchema }),
    }),

    sendClientEmail: tool({
      description: "Prépare une intention d’envoi d’email client. Cette action nécessite toujours une validation humaine et ne contacte pas Gmail tant que l’intégration n’est pas connectée.",
      inputSchema: z.object({
        recipient: z.string(),
        subject: z.string(),
        body: z.string(),
      }),
      execute: async ({ recipient, subject }) => ({
        status: "not_sent_integration_missing",
        recipient,
        subject,
        message: "Le provider Gmail n’est pas connecté : aucun email n’a été envoyé et aucune action externe n’est déclarée comme réalisée.",
      }),
    }),
    ...(agentId === "prod" ? {
      preflightPdf: tool({
        description: "Contrôle le PDF joint avec un profil prépresse et retourne uniquement les mesures, alertes et limites vérifiables. Le fichier reste côté navigateur.",
        inputSchema: z.object({ profile: z.enum(["generic", "a4Landscape", "a4Portrait", "digitalPrint"]).default("generic") }),
      }),
      addBleedPdf: tool({
        description: "Prépare une copie du PDF joint avec un fond perdu choisi. Cette opération est locale et ne modifie jamais l’original.",
        inputSchema: z.object({ bleedMm: z.number().min(0.1).max(20), dpi: z.enum(["150", "300"]).default("300"), method: z.enum(["edge_repeat", "edge_stretch", "mirror", "blank"]).default("edge_repeat") }),
      }),
      addCutlinePdf: tool({
        description: "Ajoute à une copie du PDF joint un tracé vectoriel en ton direct. Les dimensions doivent être confirmées par l’utilisateur.",
        inputSchema: z.object({ mode: z.enum(["trim", "custom"]).default("trim"), widthMm: z.number().positive().optional(), heightMm: z.number().positive().optional(), spotName: z.string().min(1).max(64).default("CutContour"), lineWidthPt: z.number().positive().max(20).default(0.25) }),
      }),
      imposePdf: tool({
        description: "Prépare une copie d’épreuve N-up du PDF joint. Ne présente pas cette sortie comme une imposition de production certifiée.",
        inputSchema: z.object({ sheet: z.enum(["a4", "a3"]).default("a4"), columns: z.number().int().min(1).max(4).default(2), rows: z.number().int().min(1).max(4).default(2), gutterMm: z.number().min(0).max(100).default(5), marginMm: z.number().min(0).max(100).default(5) }),
      }),
    } : {}),
  };
  const allowlist: Record<AgentId, string[]> = {
    celian: ["searchWorkspaceProjects", "getProjectContext", "listWorkspaceTasks", "createWorkspaceTask", "createActivity", "getRecentActivity", "Agent", "PlanWrite", "Question"],
    prod: ["getProjectContext", "searchWorkspaceFiles", "createActivity", "preflightPdf", "addBleedPdf", "addCutlinePdf", "imposePdf", "Question"],
    client: ["getProjectContext", "getRecentActivity", "createActivity", "sendClientEmail", "PlanWrite", "Question"],
    design: ["getProjectContext", "searchWorkspaceFiles", "createActivity", "Question"],
    dev: ["getProjectContext", "listWorkspaceTasks", "createWorkspaceTask", "createActivity", "PlanWrite", "Question"],
    business: ["getProjectContext", "listWorkspaceTasks", "createActivity", "Question"],
    bts: ["getProjectContext", "createActivity", "Question"],
  };
  const allowed = new Set(allowlist[agentId]);
  return Object.fromEntries(Object.entries(allTools).filter(([name]) => allowed.has(name)));
}

function getPublicStreamError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("high demand") || message.includes("unavailable") || message.includes("503")) {
    return "Gemini est momentanément très sollicité. Réessayez dans quelques instants.";
  }
  return "Impossible de terminer cette exécution. Vérifiez le provider configuré puis réessayez.";
}

export async function POST(request: Request) {
  const identity = await authenticateAiRequest(request);
  if (!identity.ok) return aiAuthError(identity);
  try {
    const body = chatRequestSchema.parse(await request.json());
    const rawAgentId = body.agentId ?? "celian";
    const agentId = agentIdSchema.parse(rawAgentId);
    const agent = getAgent(agentId);
    const projectId = body.projectId;
    const modelChoice = normalizeModelChoice(body.model);
    const projectMemory = projectId ? await getProjectMemory(projectId, body.workspaceContext) : undefined;
    const tools = createWorkspaceTools(agentId, identity.userId, projectId, projectMemory, body.workspaceContext);
    const model = getProvider(modelChoice, agent.model);
    const messages = body.messages as UIMessage[];

    const modelMessages = await convertToModelMessages(messages, { tools });
    const result = streamText({
      model,
      messages: modelMessages,
      system: buildAgentSystemPrompt({ agent, projectId, memory: projectMemory, mode: body.mode }),
      tools,
      toolApproval: {
        PlanWrite: "user-approval",
        sendClientEmail: "user-approval",
      },
      maxRetries: 0,
      stopWhen: isStepCount(agentMaxSteps),
      onStepEnd: async ({ toolCalls, toolResults }) => {
        console.info("[celian-ai] agent step", { agentId, toolCalls: toolCalls.length, toolResults: toolResults.length });
      },
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        tools,
        onError: getPublicStreamError,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de démarrer la conversation.";
    const safeMessage = message.includes("n’est pas configuré") ? message : "Impossible de démarrer la conversation. Vérifiez votre configuration Gemini/OpenAI.";
    return Response.json({ error: safeMessage }, { status: message.includes("configuré") ? 503 : 400 });
  }
}
