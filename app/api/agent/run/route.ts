import { NextResponse } from "next/server";
import { runAgent } from "@/lib/ai/orchestration/runner";
import { normalizeAgentHandle, routeGoal } from "@/lib/ai/orchestration/router";
import { getAgent } from "@/lib/ai/agents";
import type { AgentId } from "@/lib/ai/types";
import { aiAuthError, authenticateAiRequest } from "@/lib/firebase/server-auth";

const explicitHandles: Record<string, AgentId> = {
  celian: "celian",
  prod: "prod",
  client: "client",
  design: "design",
  dev: "dev",
  business: "business",
  bts: "bts",
};

export async function POST(request: Request) {
  const identity = await authenticateAiRequest(request);
  if (!identity.ok) return aiAuthError(identity);
  try {
    const body = (await request.json()) as { goal?: string; agentId?: AgentId; projectId?: string; workspaceContext?: Record<string, unknown> };
    if (!body.goal?.trim()) return NextResponse.json({ error: "Une demande est requise." }, { status: 400 });
    const requestedHandle = body.goal.match(/@([a-zà-ÿ]+)/i)?.[1];
    const explicitAgent = body.agentId ?? (requestedHandle ? explicitHandles[normalizeAgentHandle(requestedHandle)] : undefined);
    const routeCandidates = routeGoal(body.goal, explicitAgent);
    const primaryAgent = routeCandidates[0] ?? "celian";
    const primary = await runAgent({
      agentId: primaryAgent,
      goal: body.goal,
      context: { userId: identity.userId, projectId: body.projectId, facts: { routeCandidates, workspaceContext: body.workspaceContext } },
    });

    if (primaryAgent !== "celian" || routeCandidates.length <= 1 || primary.status === "failed") {
      return NextResponse.json(primary);
    }

    const alreadyDelegated = new Set(
      primary.events
        .filter((event) => event.type === "handoff_started" && typeof event.metadata?.to === "string")
        .map((event) => String(event.metadata?.to)),
    );
    const delegated = [];
    for (const delegatedAgentId of routeCandidates.slice(1, 4).filter((id) => !alreadyDelegated.has(id))) {
      const specialist = getAgent(delegatedAgentId);
      delegated.push(await runAgent({
        agentId: delegatedAgentId,
        goal: `Analyse uniquement l’aspect ${specialist.role} de cette demande et rends les éléments confirmés, les points manquants et la prochaine action utile : ${body.goal}`,
        context: { userId: identity.userId, projectId: body.projectId, facts: { routeCandidates, delegatedFrom: "celian", workspaceContext: body.workspaceContext } },
      }));
    }

    const events = [...primary.events];
    for (const [index, result] of delegated.entries()) {
      const delegatedId = routeCandidates.slice(1, 4).filter((id) => !alreadyDelegated.has(id))[index];
      events.push({ id: crypto.randomUUID(), type: "handoff_started", agentId: "celian", summary: `@Célian transmet le sous-objectif à @${delegatedId}`, metadata: { to: delegatedId }, createdAt: new Date().toISOString() });
      events.push(...result.events);
    }

    return NextResponse.json({
      status: delegated.some((result) => result.status === "waiting_for_approval") ? "waiting_for_approval" : "completed",
      answer: [primary.answer, ...delegated.map((result) => result.answer)].filter(Boolean).join("\n\n"),
      events,
      pendingAction: delegated.find((result) => result.pendingAction)?.pendingAction,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isConfigurationError = message.includes("n’est pas configuré") || message.includes("n'est pas configuré");
    return NextResponse.json({ error: isConfigurationError ? message : "Impossible d’exécuter cette demande. Réessayez." }, { status: isConfigurationError ? 503 : 500 });
  }
}
