import { NextResponse } from "next/server";
import { runAgent } from "@/lib/ai/orchestration/runner";
import { routeGoal } from "@/lib/ai/orchestration/router";
import type { AgentId } from "@/lib/ai/types";

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
  try {
    const body = (await request.json()) as { goal?: string; agentId?: AgentId; projectId?: string };
    if (!body.goal?.trim()) return NextResponse.json({ error: "Une demande est requise." }, { status: 400 });
    const requestedHandle = body.goal.match(/@([a-zà-ÿ]+)/i)?.[1]?.toLowerCase();
    const explicitAgent = body.agentId ?? (requestedHandle ? explicitHandles[requestedHandle] : undefined);
    const routeCandidates = routeGoal(body.goal, explicitAgent);
    const agentId = routeCandidates[0] ?? "celian";
    const result = await runAgent({
      agentId,
      goal: body.goal,
      context: { userId: "current-user", projectId: body.projectId, facts: { routeCandidates } },
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Impossible d’exécuter cette demande." }, { status: 500 });
  }
}
