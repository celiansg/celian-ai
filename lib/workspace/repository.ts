"use client";

import { firebaseAuth, firestore } from "@/lib/firebase/client";
import {
  createActivity as createCloudActivity,
  createProject as createCloudProject,
  createTask as createCloudTask,
  deleteProject as deleteCloudProject,
  deleteTask as deleteCloudTask,
  listActivities as listCloudActivities,
  listProjects as listCloudProjects,
  listTasks as listCloudTasks,
  updateTask as updateCloudTask,
} from "@/lib/firebase/data";
import {
  createLocalActivity,
  createLocalProject,
  createLocalTask,
  deleteLocalProject,
  deleteLocalTask,
  listLocalActivities,
  listLocalProjects,
  listLocalTasks,
  updateLocalTask,
} from "@/lib/local-workspace/indexed-db";
import type { LocalActivity, LocalProject, LocalTask, LocalTaskPriority } from "@/lib/local-workspace/types";

function currentCloudUser() {
  return firebaseAuth?.currentUser && firestore ? firebaseAuth.currentUser : null;
}

function toIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).toISOString();
  }
  return new Date().toISOString();
}

export async function listWorkspaceProjects() {
  const user = currentCloudUser();
  if (!user) return listLocalProjects();
  const projects = await listCloudProjects(user.uid);
  return projects.map((project) => ({ ...project, createdAt: toIso(project.createdAt), updatedAt: toIso(project.updatedAt) })) as LocalProject[];
}

export async function createWorkspaceProject(input: { name: string; description?: string }) {
  const user = currentCloudUser();
  if (!user) return createLocalProject(input);
  const reference = await createCloudProject(user.uid, { name: input.name.trim(), description: input.description?.trim() ?? "" });
  const now = new Date().toISOString();
  return { id: reference.id, name: input.name.trim(), description: input.description?.trim() ?? "", status: "active" as const, progress: 0, createdAt: now, updatedAt: now };
}

export async function deleteWorkspaceProject(id: string) {
  const user = currentCloudUser();
  if (!user) return deleteLocalProject(id);
  await deleteCloudProject(id);
}

export async function listWorkspaceTasks() {
  const user = currentCloudUser();
  if (!user) return listLocalTasks();
  const tasks = await listCloudTasks(user.uid);
  return tasks.map((task) => ({ ...task, description: task.description ?? "", createdAt: toIso(task.createdAt), updatedAt: toIso(task.createdAt), dueAt: task.dueAt ? toIso(task.dueAt) : undefined })) as LocalTask[];
}

export async function createWorkspaceTask(input: { title: string; description?: string; projectId?: string; assignedAgentId?: string; priority?: LocalTaskPriority; dueAt?: string }) {
  const user = currentCloudUser();
  if (!user) return createLocalTask(input);
  const reference = await createCloudTask(user.uid, { title: input.title.trim(), description: input.description?.trim() ?? "", projectId: input.projectId || undefined, assignedAgentId: input.assignedAgentId || undefined, priority: input.priority ?? "medium", dueAt: input.dueAt || undefined });
  const now = new Date().toISOString();
  return { id: reference.id, title: input.title.trim(), description: input.description?.trim() ?? "", projectId: input.projectId || undefined, assignedAgentId: input.assignedAgentId || undefined, priority: input.priority ?? "medium", status: "todo" as const, dueAt: input.dueAt || undefined, createdAt: now, updatedAt: now };
}

export async function updateWorkspaceTask(id: string, input: Partial<Pick<LocalTask, "title" | "description" | "projectId" | "assignedAgentId" | "priority" | "status" | "dueAt">>) {
  const user = currentCloudUser();
  if (!user) return updateLocalTask(id, input);
  await updateCloudTask(id, input as never);
}

export async function deleteWorkspaceTask(id: string) {
  const user = currentCloudUser();
  if (!user) return deleteLocalTask(id);
  await deleteCloudTask(id);
}

export async function listWorkspaceActivities() {
  const user = currentCloudUser();
  if (!user) return listLocalActivities();
  const activities = await listCloudActivities(user.uid);
  return activities.map((activity) => ({ id: activity.id, description: String(activity.description ?? ""), agentId: String(activity.agentId ?? "celian"), projectId: activity.projectId ? String(activity.projectId) : undefined, type: String(activity.type ?? "workspace_activity"), createdAt: toIso(activity.createdAt) })) as LocalActivity[];
}

export async function createWorkspaceActivity(input: { description: string; agentId?: string; projectId?: string; type?: string }) {
  const user = currentCloudUser();
  if (!user) return createLocalActivity(input);
  const reference = await createCloudActivity(user.uid, input.description, input.agentId, input.projectId);
  return { id: reference.id, description: input.description, agentId: input.agentId ?? "celian", projectId: input.projectId, type: input.type ?? "workspace_activity", createdAt: new Date().toISOString() };
}

export function isWorkspaceCloudBacked() {
  return Boolean(currentCloudUser());
}
