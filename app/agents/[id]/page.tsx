import { notFound } from "next/navigation";
import { getAgent } from "@/lib/ai/agents";
import { AgentWorkspace } from "@/components/agent-workspace";

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = getAgent(id as Parameters<typeof getAgent>[0]);
  if (agent.id !== id) notFound();
  return <AgentWorkspace agent={agent} availableProviders={{ gemini: Boolean(process.env.GEMINI_API_KEY), openai: Boolean(process.env.OPENAI_API_KEY) }} />;
}
