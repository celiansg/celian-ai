"use client";

import { Bot, ListChecks } from "lucide-react";
import { ModeSelector } from "@/components/agent-elements/input/mode-selector";

export type AgentMode = "agent" | "plan";

export function AgentModeSelector({
  value,
  onChange,
}: {
  value: AgentMode;
  onChange: (value: AgentMode) => void;
}) {
  return <ModeSelector
    modes={[
      { id: "agent", label: "Agent", icon: Bot, description: "Agir directement sur les étapes réversibles" },
      { id: "plan", label: "Plan", icon: ListChecks, description: "Préparer un plan avant les actions importantes" },
    ]}
    value={value}
    onChange={(nextValue) => onChange(nextValue as AgentMode)}
    className="agent-mode-selector"
  />;
}
