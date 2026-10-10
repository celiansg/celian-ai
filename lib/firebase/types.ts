export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "completed" | "archived";
export type TaskPriority = "low" | "medium" | "high";

export interface FirebaseProject {
  id: string;
  userId: string;
  spaceId?: string;
  name: string;
  description: string;
  imageUrl?: string;
  status: ProjectStatus;
  progress: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface FirebaseTask {
  id: string;
  userId: string;
  projectId?: string;
  assignedAgentId?: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt?: unknown;
  createdAt: unknown;
}
