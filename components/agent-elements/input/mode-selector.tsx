"use client";

import { memo, useCallback, useState, type ComponentType } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../utils/cn";
import { Popover } from "./popover";

export type ModeOption = { id: string; label: string; icon?: ComponentType<{ className?: string }>; description?: string };

export const ModeSelector = memo(function ModeSelector({
  modes,
  value,
  defaultValue,
  onChange,
  className,
}: {
  modes: ModeOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (modeId: string) => void;
  className?: string;
}) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeId = isControlled ? value : internalValue;
  const activeMode = modes.find((mode) => mode.id === activeId) ?? modes[0];
  const [open, setOpen] = useState(false);
  const hasMultiple = modes.length > 1;

  const handleSelect = useCallback((id: string) => {
    if (!isControlled) setInternalValue(id);
    onChange?.(id);
    setOpen(false);
  }, [isControlled, onChange]);

  if (!activeMode) return null;
  const ActiveIcon = activeMode.icon;
  const trigger = (
    <button type="button" className={cn("agent-elements-mode-trigger", className, !hasMultiple && "single")} aria-label="Choisir le mode d’exécution">
      {ActiveIcon ? <ActiveIcon className="agent-elements-mode-icon" /> : null}
      <span>{activeMode.label}</span>
      {hasMultiple ? <ChevronDown size={13} aria-hidden="true" /> : null}
    </button>
  );

  if (!hasMultiple) return trigger;
  return (
    <Popover open={open} onOpenChange={setOpen} trigger={trigger}>
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = mode.id === activeMode.id;
        return (
          <button type="button" key={mode.id} onClick={() => handleSelect(mode.id)} className={cn("agent-elements-mode-option", isActive && "active")}>
            {Icon ? <Icon className="agent-elements-mode-icon" /> : null}
            <span><strong>{mode.label}</strong>{mode.description ? <small>{mode.description}</small> : null}</span>
            {isActive ? <Check size={14} aria-hidden="true" /> : null}
          </button>
        );
      })}
    </Popover>
  );
});
