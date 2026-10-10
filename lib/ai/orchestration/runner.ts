import { agentMaxSteps, resolveProvider } from "../config";
import { getAgent } from "../agents";
import { getAIProvider } from "../providers";
import { getTool } from "../tools";
import type { AgentContext, AgentEventType, AgentId, AgentRunEvent, AgentRunResult } from "../types";

function event(type: AgentEventType, agentId: AgentId, summary: string, metadata?: Record<string, unknown>): AgentRunEvent {
  return { id: crypto.randomUUID(), type, agentId, summary, metadata, createdAt: new Date().toISOString() };
}

export async function runAgent({ agentId, goal, context }: { agentId: AgentId; goal: string; context: AgentContext }): Promise<AgentRunResult> {
  const definition = getAgent(agentId);
  const provider = getAIProvider(resolveProvider(definition.provider));
  const events: AgentRunEvent[] = [event("agent_started", agentId, `${definition.handle} analyse la demande` )];
  let answer = "";

  for (let step = 0; step < agentMaxSteps; step += 1) {
    const response = await provider.generate({
      system: definition.instructions,
      prompt: goal,
      context: { projectId: context.projectId, step, agentId, ...(context.facts ?? {}) },
      tools: definition.tools,
    });
    answer = response.text;

    if (response.toolCall) {
      const tool = getTool(response.toolCall.name);
      events.push(event("tool_called", agentId, `${definition.handle} utilise ${response.toolCall.name}`, { input: response.toolCall.input }));
      if (tool) {
        const result = await tool.execute(response.toolCall.input);
        events.push(event("tool_result", agentId, `${response.toolCall.name} a renvoyé un résultat structuré`, { result }));
      }
    }

    if (response.handoff) {
      const nextAgent = getAgent(response.handoff);
      events.push(event("handoff_started", agentId, `${definition.handle} transmet le dossier à ${nextAgent.handle}`, { to: response.handoff }));
      const delegated = await runAgent({ agentId: response.handoff, goal, context: { ...context, facts: { ...(context.facts ?? {}), delegatedFrom: agentId } } });
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

    break;
  }

  events.push(event("agent_completed", agentId, `${definition.handle} a terminé la préparation`));
  return { status: "completed", answer, events };
}
