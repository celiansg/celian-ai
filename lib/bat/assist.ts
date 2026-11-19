import type { BatDraftInput } from "./fields";

export type BatAssistResult = {
  fields: BatDraftInput;
  factsUsed: string[];
  warnings: string[];
  confidence: "high" | "medium" | "low";
};
