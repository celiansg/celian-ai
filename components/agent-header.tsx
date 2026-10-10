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
}: {
  agent: AgentDefinition;
  model: ModelChoice;
  mode: AgentMode;
  onModelChange: (model: ModelChoice) => void;
  onModeChange: (mode: AgentMode) => void;
}) {
  return (
    <header className="agent-header">
      <div className="agent-header-main">
        <Link href="/agents" className="agent-back" aria-label="Retour aux agents">
          <ArrowLeft size={17} />
        </Link>
        <AgentAvatar agentId={agent.id} size="md" showStatus />
        <div className="agent-header-copy">
          <div className="agent-header-title-row">
            <h1>{agent.handle}</h1>
            <span className="agent-availability"><CircleCheck size={12} /> Disponible</span>
          </div>
          <p>{agent.role} · {agent.description}</p>
        </div>
      </div>
      <div className="agent-header-actions">
        <span className="agent-tools-count"><Wrench size={13} /> {agent.tools.length} outils</span>
        <AgentModeSelector value={mode} onChange={onModeChange} />
        <AgentModelPicker value={model} onChange={onModelChange} />
      </div>
    </header>
  );
}
