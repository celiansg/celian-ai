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
import { agentMaxSteps } from "@/lib/ai/config";
import { defaultGeminiModel, normalizeModelChoice } from "@/lib/ai/models";
import { runAgent } from "@/lib/ai/orchestration/runner";
import type { AgentId } from "@/lib/ai/types";

const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).default([]),
  agentId: z.string().optional(),
  mode: z.enum(["agent", "plan"]).default("agent"),
  model: z.unknown().optional(),
  projectId: z.string().optional(),
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

function createWorkspaceTools(projectId: string | undefined, agentId: AgentId) {
  return {
    getProjectContext: tool({
      description: "Récupère le contexte structuré du projet actif.",
      inputSchema: z.object({
        requestedProjectId: z.string().optional().describe("Identifiant du projet si différent du projet actif"),
      }),
      execute: async ({ requestedProjectId }) => ({
        projectId: requestedProjectId ?? projectId ?? null,
        status: "not_configured",
        message: "Aucun projet n’est encore associé à cette conversation.",
      }),
    }),

    listWorkspaceTasks: tool({
      description: "Liste les tâches ouvertes pertinentes pour l’objectif courant.",
      inputSchema: z.object({
        scope: z.enum(["today", "project", "all"]).default("today"),
      }),
      execute: async ({ scope }) => ({
        scope,
        tasks: [],
        count: 0,
      }),
    }),

    searchWorkspaceFiles: tool({
      description: "Recherche les fichiers liés au projet dans l’espace de travail.",
      inputSchema: z.object({
        query: z.string().describe("Nom ou type de fichier recherché"),
      }),
      execute: async ({ query }) => ({
        query,
        files: [],
        count: 0,
        message: "Aucun fichier correspondant n’a été trouvé.",
      }),
    }),

    createWorkspaceTask: tool({
      description: "Crée une tâche interne non critique dans le projet.",
      inputSchema: z.object({
        title: z.string().min(2),
        description: z.string().optional(),
      }),
      execute: async ({ title, description }) => ({
        id: `task-${Date.now()}`,
        title,
        description: description ?? "",
        projectId,
        createdBy: agentId,
        status: "created",
      }),
    }),

    createActivity: tool({
      description: "Ajoute une trace d’activité lisible dans le projet.",
      inputSchema: z.object({ description: z.string().min(2) }),
      execute: async ({ description }) => ({
        id: `activity-${Date.now()}`,
        description,
        projectId,
        status: "recorded",
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
          context: { userId: "current-user", projectId },
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
        status: "approved_pending_integration",
        recipient,
        subject,
        message: "Action validée et enregistrée. Gmail devra être connecté pour effectuer l’envoi réel.",
      }),
    }),
  };
}

function getPublicStreamError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("high demand") || message.includes("unavailable") || message.includes("503")) {
    return "Gemini est momentanément très sollicité. Réessayez dans quelques instants.";
  }
  return "Impossible de terminer cette exécution. Vérifiez le provider configuré puis réessayez.";
}

export async function POST(request: Request) {
  try {
    const body = chatRequestSchema.parse(await request.json());
    const rawAgentId = body.agentId ?? "celian";
    const agentId = agentIdSchema.parse(rawAgentId);
    const agent = getAgent(agentId);
    const projectId = body.projectId;
    const modelChoice = normalizeModelChoice(body.model);
    const tools = createWorkspaceTools(projectId, agentId);
    const model = getProvider(modelChoice, agent.model);
    const messages = body.messages as UIMessage[];

    const modelMessages = await convertToModelMessages(messages, { tools });
    const result = streamText({
      model,
      messages: modelMessages,
      system: [
        `Tu es ${agent.handle}, ${agent.role}, dans Célian AI.`,
        agent.instructions,
        `Objectif produit : faire avancer le travail avec des actions traçables, pas simplement discuter.`,
        `Contexte projet actif : ${projectId || "aucun projet sélectionné"}. Utilise les outils lorsque cela apporte une information vérifiable.`,
        `Quand une demande implique plusieurs spécialités, ${agentId === "celian" ? "délègue avec l’outil Agent et synthétise les résultats." : "signale clairement le relais recommandé."}`,
        `Ne révèle jamais de chaîne de pensée privée. Décris seulement les actions, outils, résultats, blocages et prochaines étapes utiles.`,
        `Ne prétends jamais avoir envoyé un email, modifié un fichier externe ou connecté une intégration si l’outil ne le confirme pas.`,
        body.mode === "plan"
          ? "Mode Plan : pour une demande comportant plusieurs actions, commence par un PlanWrite public et attends son approbation avant les actions importantes."
          : "Mode Agent : agis directement pour les opérations réversibles et demande validation pour les actions sensibles.",
      ].join("\n\n"),
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
