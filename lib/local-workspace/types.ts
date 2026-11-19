export type LocalProjectStatus = "active" | "paused" | "completed" | "archived";
export type LocalTaskStatus = "todo" | "in_progress" | "completed" | "archived";
export type LocalTaskPriority = "low" | "medium" | "high";

import type { AgentRunEvent, AgentId, AgentRunResult, PendingAction } from "../ai/types";
import type { PreflightReport } from "../bat/preflight";

export interface LocalProject {
  id: string;
  name: string;
  description: string;
  status: LocalProjectStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocalTask {
  id: string;
  projectId?: string;
  assignedAgentId?: string;
  title: string;
  description: string;
  priority: LocalTaskPriority;
  status: LocalTaskStatus;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalActivity {
  id: string;
  projectId?: string;
  agentId: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface LocalWorkspaceSnapshot {
  projects: LocalProject[];
  tasks: LocalTask[];
  activities: LocalActivity[];
}

export interface LocalPreflightReport {
  id: string;
  fileName: string;
  fileSha256?: string;
  profileId: string;
  status: PreflightReport["status"];
  report: PreflightReport;
  createdAt: string;
}

export interface LocalAgentRun {
  id: string;
  goal: string;
  agentId: AgentId;
  status: AgentRunResult["status"];
  answer: string;
  events: AgentRunEvent[];
  pendingAction?: PendingAction;
  createdAt: string;
}
