"use client";

export type AgentMode = "agent" | "plan";

export function AgentModeSelector({
  value,
  onChange,
}: {
  value: AgentMode;
  onChange: (value: AgentMode) => void;
}) {
  return (
    <div className="agent-mode-selector" role="group" aria-label="Mode d’exécution">
      <button type="button" className={value === "agent" ? "active" : ""} onClick={() => onChange("agent")} aria-pressed={value === "agent"}>
        Agent
      </button>
      <button type="button" className={value === "plan" ? "active" : ""} onClick={() => onChange("plan")} aria-pressed={value === "plan"}>
        Plan
      </button>
    </div>
  );
}
