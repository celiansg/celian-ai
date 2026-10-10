"use client";

import { ModelPicker } from "@/components/agent-elements/input/model-picker";
import { modelOptions, type ModelChoice } from "@/lib/ai/models";

export function AgentModelPicker({
  value,
  onChange,
  availableProviders,
}: {
  value: ModelChoice;
  onChange: (value: ModelChoice) => void;
  availableProviders: { gemini: boolean; openai: boolean };
}) {
  const availableModels = modelOptions
    .filter((option) => option.id === "auto" || availableProviders[option.id])
    .map((option) => ({ id: option.id, name: option.label }));

  return <ModelPicker models={availableModels} value={value} onChange={(nextValue) => onChange(nextValue as ModelChoice)} className="agent-control agent-model-control" />;
}
