"use client";

import { memo, useCallback, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { ModelOption } from "../types";
import { cn } from "../utils/cn";
import { Popover } from "./popover";

export const ModelPicker = memo(function ModelPicker({
  models,
  value,
  defaultValue,
  onChange,
  placeholder = "Auto",
  className,
}: {
  models: ModelOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (modelId: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeId = isControlled ? value : internalValue;
  const activeModel = models.find((model) => model.id === activeId) ?? models[0];
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback((id: string) => {
    if (!isControlled) setInternalValue(id);
    onChange?.(id);
    setOpen(false);
  }, [isControlled, onChange]);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={(
        <button type="button" className={cn("agent-elements-picker-trigger", className)} aria-label="Choisir le provider IA">
          <span>{activeModel?.name ?? placeholder}</span>
          {activeModel?.version ? <span className="agent-elements-picker-version">{activeModel.version}</span> : null}
          <ChevronDown size={13} aria-hidden="true" />
        </button>
      )}
    >
      {models.map((model) => {
        const isActive = model.id === activeModel?.id;
        return (
          <button type="button" key={model.id} onClick={() => handleSelect(model.id)} className={cn("agent-elements-picker-option", isActive && "active")}>
            <span>{model.name}{model.version ? <small>{model.version}</small> : null}</span>
            {isActive ? <Check size={14} aria-hidden="true" /> : null}
          </button>
        );
      })}
    </Popover>
  );
});
