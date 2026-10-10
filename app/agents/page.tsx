import { agents } from "@/lib/ai/agents";
import { AgentAvatar } from "@/components/agent-avatar";
import { Icon } from "@/components/icon";
import Link from "next/link";

export default function AgentsPage() {
  return <div className="standalone-page"><div className="standalone-head"><div><div className="eyebrow">Workspace / Agents</div><h1>Vos agents spécialisés</h1><p>Des rôles distincts qui lisent le contexte, utilisent des outils et se transmettent le travail.</p></div><button className="primary-button"><Icon name="plus" size={16} />Créer un agent</button></div><div className="agents-directory">{agents.map((agent) => <Link href={`/agents/${agent.id}`} className="directory-card" key={agent.id}><div className="directory-card-head"><AgentAvatar agentId={agent.id} size="lg" showStatus /><span className="agent-model">{agent.model}</span></div><h2>{agent.handle}</h2><p className="directory-role">{agent.role}</p><p>{agent.description}</p><div className="capability-list">{agent.capabilities.slice(0, 3).map((capability) => <span key={capability}>{capability}</span>)}</div><div className="directory-link">Ouvrir l’agent <Icon name="arrowRight" size={15} /></div></Link>)}</div></div>;
}
