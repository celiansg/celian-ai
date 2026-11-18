import Link from "next/link";
import { ArrowLeft, CircleCheck, Wrench } from "lucide-react";
import type { AgentDefinition } from "@/lib/ai/types";
import { AgentAvatar } from "@/components/agent-avatar";
import { AgentModelPicker } from "@/components/agent-model-picker";
import { AgentModeSelector, type AgentMode } from "@/components/agent-mode-selector";
import type { ModelChoice } from "@/lib/ai/models";

export function AgentHeader({
  agent,
  model,
  mode,
  onModelChange,
  onModeChange,
  availableProviders,
}: {
  agent: AgentDefinition;
  model: ModelChoice;
  mode: AgentMode;
  onModelChange: (model: ModelChoice) => void;
  onModeChange: (mode: AgentMode) => void;
  availableProviders: { gemini: boolean; openai: boolean };
}) {
  return (
    <header className="agent-header">
      <div className="agent-header-main">
        <Link href="/agents" className="agent-back" aria-label="Retour aux agents">
          <ArrowLeft size={17} aria-hidden="true" />
        </Link>
        <AgentAvatar agentId={agent.id} size="md" showStatus />
        <div className="agent-header-copy">
          <div className="agent-header-title-row">
            <h1>{agent.handle}</h1>
            <span className="agent-availability"><CircleCheck size={12} aria-hidden="true" /> Disponible</span>
          </div>
          <p>{agent.role} · {agent.description}</p>
        </div>
      </div>
      <div className="agent-header-actions">
        {agent.id === "prod" && <Link href="/bat" className="secondary-button">Nouveau BAT</Link>}
        {agent.id === "client" && <Link href="/mail" className="secondary-button">Rédiger un mail</Link>}
        <span className="agent-tools-count"><Wrench size={13} aria-hidden="true" /> {agent.tools.length} outils</span>
        <AgentModeSelector value={mode} onChange={onModeChange} />
        <AgentModelPicker value={model} onChange={onModelChange} availableProviders={availableProviders} />
      </div>
    </header>
  );
}
