import { notFound } from "next/navigation";
import { getAgent } from "@/lib/ai/agents";
import { AgentAvatar } from "@/components/agent-avatar";
import { Icon } from "@/components/icon";

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = getAgent(id as Parameters<typeof getAgent>[0]);
  if (agent.id !== id) notFound();
  return <div className="standalone-page agent-detail-page"><div className="detail-breadcrumb">Agents <Icon name="chevronRight" size={14} /> {agent.handle}</div><div className="agent-detail-hero"><AgentAvatar agentId={agent.id} size="lg" showStatus /><div><div className="eyebrow">Agent spécialisé</div><h1>{agent.handle}</h1><p>{agent.description}</p></div><span className="detail-status"><i />Disponible</span></div><div className="agent-detail-grid"><section className="detail-card"><div className="detail-card-heading"><Icon name="sparkles" size={17} /><h2>Capacités</h2></div><div className="capability-list large">{agent.capabilities.map((capability) => <span key={capability}>{capability}</span>)}</div></section><section className="detail-card"><div className="detail-card-heading"><Icon name="zap" size={17} /><h2>Outils disponibles</h2></div><div className="tool-list">{agent.tools.map((tool) => <div key={tool}><span className="tool-dot" /><span>{tool}</span><Icon name="check" size={14} /></div>)}</div></section><section className="detail-card wide"><div className="detail-card-heading"><Icon name="activity" size={17} /><h2>Activité récente</h2></div><div className="detail-empty"><Icon name="clock" size={18} /><p>Les prochaines exécutions et transmissions de cet agent apparaîtront ici.</p></div></section></div></div>;
}
