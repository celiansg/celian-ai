export type LocalProjectStatus = "active" | "paused" | "completed" | "archived";
export type LocalTaskStatus = "todo" | "in_progress" | "completed" | "archived";
export type LocalTaskPriority = "low" | "medium" | "high";

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
