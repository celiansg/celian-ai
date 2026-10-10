"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import { modelOptions, type ModelChoice } from "@/lib/ai/models";

export function AgentModelPicker({
  value,
  onChange,
}: {
  value: ModelChoice;
  onChange: (value: ModelChoice) => void;
}) {
  return (
    <label className="agent-control agent-model-control">
      <Sparkles size={13} aria-hidden="true" />
      <span className="sr-only">Provider IA</span>
      <select value={value} onChange={(event) => onChange(event.target.value as ModelChoice)} aria-label="Choisir le provider IA">
        {modelOptions.map((option) => (
          <option value={option.id} key={option.id}>{option.label}</option>
        ))}
      </select>
      <ChevronDown size={13} aria-hidden="true" />
    </label>
  );
}
