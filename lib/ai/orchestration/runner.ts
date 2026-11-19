import { agentMaxSteps, resolveProvider } from "../config";
import { getAgent } from "../agents";
import { getAIProvider } from "../providers";
import { getTool } from "../tools";
import { buildAgentSystemPrompt } from "../policy";
import { getProjectMemory } from "../memory/project-memory";
import type { AgentContext, AgentEventType, AgentId, AgentRunEvent, AgentRunResult } from "../types";
import type { ToolDefinition } from "../tools";

function event(type: AgentEventType, agentId: AgentId, summary: string, metadata?: Record<string, unknown>): AgentRunEvent {
  return { id: crypto.randomUUID(), type, agentId, summary, metadata, createdAt: new Date().toISOString() };
}

export async function runAgent({ agentId, goal, context, handoffDepth = 0 }: { agentId: AgentId; goal: string; context: AgentContext; handoffDepth?: number }): Promise<AgentRunResult> {
  const definition = getAgent(agentId);
  const provider = getAIProvider(resolveProvider(definition.provider));
  const projectMemory = context.projectId ? await getProjectMemory(context.projectId, context.facts?.workspaceContext as Parameters<typeof getProjectMemory>[1]) : undefined;
  const events: AgentRunEvent[] = [event("agent_started", agentId, `${definition.handle} analyse la demande` )];
  let answer = "";
  const seenActions = new Set<string>();
  let stepPrompt = goal;

  const configuredTools = definition.tools.map((name) => getTool(name)).filter((tool): tool is ToolDefinition => Boolean(tool));
  if (agentId === "celian") {
    configuredTools.push({
      name: "delegateAgent",
      description: "Transmet un sous-objectif précis à un agent spécialisé et renvoie son résultat public.",
      permission: "read",
      inputSchema: { agentId: "string", goal: "string" },
      execute: async (input, delegatedContext) => {
        const delegatedAgentId = typeof input.agentId === "string" && ["celian", "prod", "client", "design", "dev", "business", "bts"].includes(input.agentId)
          ? input.agentId as AgentId
          : undefined;
        if (!delegatedAgentId || typeof input.goal !== "string" || input.goal.trim().length < 5) {
          return { status: "invalid", message: "Le sous-objectif ou l’agent demandé est invalide." };
        }
        const delegated = await runAgent({ agentId: delegatedAgentId, goal: input.goal, context: delegatedContext, handoffDepth: handoffDepth + 1 });
        return { status: delegated.status, agentId: delegatedAgentId, summary: delegated.answer, events: delegated.events };
      },
    });
  }

  for (let step = 0; step < agentMaxSteps; step += 1) {
    const response = await provider.generate({
      system: buildAgentSystemPrompt({ agent: definition, projectId: context.projectId, memory: projectMemory, mode: "agent" }),
      prompt: stepPrompt,
      context: { projectId: context.projectId, step, agentId, ...(context.facts ?? {}) },
      tools: definition.tools,
      toolDefinitions: configuredTools,
      toolContext: context,
    });
    answer = response.text;

    if (response.toolCall) {
      events.push(event("tool_called", agentId, `${definition.handle} utilise ${response.toolCall.name}`, { input: response.toolCall.input }));
      const result = response.toolResults?.find((item) => item.name === response.toolCall?.name)?.result;
      const resultStatus = typeof result?.status === "string" ? result.status : "completed";
      const resultSummary = resultStatus === "not_connected" || resultStatus === "not_persisted"
        ? `${response.toolCall.name} n’est pas confirmé : ${String(result?.message ?? resultStatus)}`
        : `${response.toolCall.name} a renvoyé un résultat vérifiable`;
      events.push(event("tool_result", agentId, resultSummary, { result, status: resultStatus }));
      if (response.toolCall.name === "delegateAgent" && result?.agentId) {
        const delegatedAgent = getAgent(result.agentId as AgentId);
        events.push(event("handoff_started", agentId, `${definition.handle} transmet le dossier à ${delegatedAgent.handle}`, { to: delegatedAgent.id }));
        if (Array.isArray(result.events)) events.push(...result.events as AgentRunEvent[]);
      }
      stepPrompt = `${goal}\n\nRésultat public de l’outil ${response.toolCall.name} : ${JSON.stringify(result ?? { status: "not_connected" })}`;
    }

    if (response.handoff) {
      const nextAgent = getAgent(response.handoff);
      events.push(event("handoff_started", agentId, `${definition.handle} transmet le dossier à ${nextAgent.handle}`, { to: response.handoff }));
      if (handoffDepth >= 3) {
        events.push(event("agent_failed", agentId, `${definition.handle} a atteint la limite de délégation`));
        return { status: "failed", answer, events };
      }
      const delegated = await runAgent({
        agentId: response.handoff,
        goal,
        handoffDepth: handoffDepth + 1,
        context: { ...context, facts: { ...(context.facts ?? {}), delegatedFrom: agentId } },
      });
      events.push(...delegated.events);
      answer = `${answer} ${delegated.answer}`.trim();
      if (delegated.status === "waiting_for_approval") return { ...delegated, answer, events };
    }

    if (response.requiresApproval) {
      const pendingAction = {
        id: crypto.randomUUID(),
        agentId,
        actionType: "send_email",
        payload: { subject: "Réponse client préparée" },
        description: response.approvalDescription ?? "Une action externe doit être validée.",
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };
      events.push(event("approval_required", agentId, `${definition.handle} attend votre validation`));
      return { status: "waiting_for_approval", answer, events, pendingAction };
    }

    const actionKey = JSON.stringify({ toolCall: response.toolCall?.name, handoff: response.handoff });
    if (!response.toolCall && !response.handoff) break;
    if (seenActions.has(actionKey)) {
      events.push(event("agent_failed", agentId, `${definition.handle} a arrêté une action répétée pour éviter une boucle`));
      return { status: "failed", answer, events };
    }
    seenActions.add(actionKey);
  }

  events.push(event("agent_completed", agentId, `${definition.handle} a terminé la préparation`));
  return { status: "completed", answer, events };
}
