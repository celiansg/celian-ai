"use client";

import type {
  LocalActivity,
  LocalAgentRun,
  LocalPreflightReport,
  LocalProject,
  LocalProjectStatus,
  LocalTask,
  LocalTaskPriority,
  LocalTaskStatus,
  LocalWorkspaceSnapshot,
} from "./types";
import type { MailDraft, MailVersion } from "../mail/history";

// Séparé du store files géré par lib/local-files pour éviter les migrations
// croisées entre deux schémas IndexedDB indépendants.
const DB_NAME = "agents-local-data";
const DB_VERSION = 3;
const PROJECTS_STORE = "projects";
const TASKS_STORE = "tasks";
const ACTIVITIES_STORE = "activities";
const MAIL_VERSIONS_STORE = "mailVersions";
const PREFLIGHT_REPORTS_STORE = "preflightReports";
const AGENT_RUNS_STORE = "agentRuns";

function ensureBrowser() {
  if (typeof window === "undefined" || !window.indexedDB) {
    throw new Error("Le stockage local n’est pas disponible dans ce navigateur.");
  }
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openDatabase(): Promise<IDBDatabase> {
  ensureBrowser();
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROJECTS_STORE)) {
        const store = database.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
      if (!database.objectStoreNames.contains(TASKS_STORE)) {
        const store = database.createObjectStore(TASKS_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("dueAt", "dueAt", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }
      if (!database.objectStoreNames.contains(ACTIVITIES_STORE)) {
        const store = database.createObjectStore(ACTIVITIES_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!database.objectStoreNames.contains(MAIL_VERSIONS_STORE)) {
        database.createObjectStore(MAIL_VERSIONS_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(PREFLIGHT_REPORTS_STORE)) {
        const store = database.createObjectStore(PREFLIGHT_REPORTS_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("fileSha256", "fileSha256", { unique: false });
      }
      if (!database.objectStoreNames.contains(AGENT_RUNS_STORE)) {
        const store = database.createObjectStore(AGENT_RUNS_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("agentId", "agentId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Impossible d’ouvrir le stockage local."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Le stockage local a renvoyé une erreur."));
  });
}

async function readAll<T>(storeName: string): Promise<T[]> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, "readonly");
    return await requestResult(transaction.objectStore(storeName).getAll());
  } finally {
    database.close();
  }
}

async function put<T>(storeName: string, value: T): Promise<T> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error("Impossible de terminer l’écriture locale."));
      transaction.objectStore(storeName).put(value);
    });
    return value;
  } finally {
    database.close();
  }
}

export async function listLocalMailVersions() {
  const versions = await readAll<MailVersion>(MAIL_VERSIONS_STORE);
  return versions.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function saveLocalMailVersion(draft: MailDraft, batId?: string) {
  if (!draft.body.trim() || draft.body.length > 20_000 || draft.subject.length > 350) {
    throw new Error("Le brouillon doit contenir un message de 20 000 caractères maximum et un objet de 350 caractères maximum.");
  }
  const version: MailVersion = {
    subject: draft.subject,
    body: draft.body,
    id: makeId("mail"),
    createdAt: new Date().toISOString(),
    batId,
  };
  return put(MAIL_VERSIONS_STORE, version);
}

export async function saveLocalPreflightReport(input: Omit<LocalPreflightReport, "id" | "createdAt">) {
  const report: LocalPreflightReport = { ...input, id: makeId("preflight"), createdAt: new Date().toISOString() };
  return put(PREFLIGHT_REPORTS_STORE, report);
}

export async function listLocalPreflightReports() {
  const reports = await readAll<LocalPreflightReport>(PREFLIGHT_REPORTS_STORE);
  return reports.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function deleteLocalPreflightReport(id: string) {
  await remove(PREFLIGHT_REPORTS_STORE, id);
}

export async function saveLocalAgentRun(input: Omit<LocalAgentRun, "id" | "createdAt">) {
  const run: LocalAgentRun = { ...input, id: makeId("run"), createdAt: new Date().toISOString() };
  return put(AGENT_RUNS_STORE, run);
}

export async function listLocalAgentRuns() {
  const runs = await readAll<LocalAgentRun>(AGENT_RUNS_STORE);
  return runs.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function updateLocalAgentRun(id: string, input: Partial<Pick<LocalAgentRun, "status" | "answer" | "events" | "pendingAction">>) {
  const runs = await listLocalAgentRuns();
  const run = runs.find((item) => item.id === id);
  if (!run) throw new Error("Exécution introuvable.");
  return put(AGENT_RUNS_STORE, { ...run, ...input });
}

async function remove(storeName: string, id: string) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    await requestResult(transaction.objectStore(storeName).delete(id));
  } finally {
    database.close();
  }
}

export async function listLocalProjects() {
  const projects = await readAll<LocalProject>(PROJECTS_STORE);
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createLocalProject(input: { name: string; description?: string }) {
  const now = new Date().toISOString();
  const project: LocalProject = {
    id: makeId("project"),
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    status: "active",
    progress: 0,
    createdAt: now,
    updatedAt: now,
  };
  return put(PROJECTS_STORE, project);
}

export async function updateLocalProject(id: string, input: Partial<Pick<LocalProject, "name" | "description" | "status" | "progress">>) {
  const projects = await listLocalProjects();
  const project = projects.find((item) => item.id === id);
  if (!project) throw new Error("Projet introuvable.");
  return put(PROJECTS_STORE, { ...project, ...input, updatedAt: new Date().toISOString() });
}

export async function deleteLocalProject(id: string) {
  const tasks = await listLocalTasks();
  await Promise.all(tasks.filter((task) => task.projectId === id).map((task) => remove(TASKS_STORE, task.id)));
  await remove(PROJECTS_STORE, id);
}

export async function listLocalTasks() {
  const tasks = await readAll<LocalTask>(TASKS_STORE);
  return tasks.sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") || b.createdAt.localeCompare(a.createdAt));
}

export async function createLocalTask(input: {
  title: string;
  description?: string;
  projectId?: string;
  assignedAgentId?: string;
  priority?: LocalTaskPriority;
  dueAt?: string;
}) {
  const now = new Date().toISOString();
  const task: LocalTask = {
    id: makeId("task"),
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    projectId: input.projectId || undefined,
    assignedAgentId: input.assignedAgentId || undefined,
    priority: input.priority ?? "medium",
    status: "todo",
    dueAt: input.dueAt || undefined,
    createdAt: now,
    updatedAt: now,
  };
  return put(TASKS_STORE, task);
}

export async function updateLocalTask(id: string, input: Partial<Pick<LocalTask, "title" | "description" | "projectId" | "assignedAgentId" | "priority" | "status" | "dueAt">>) {
  const tasks = await listLocalTasks();
  const task = tasks.find((item) => item.id === id);
  if (!task) throw new Error("Tâche introuvable.");
  return put(TASKS_STORE, { ...task, ...input, updatedAt: new Date().toISOString() });
}

export async function deleteLocalTask(id: string) {
  await remove(TASKS_STORE, id);
}

export async function listLocalActivities() {
  const activities = await readAll<LocalActivity>(ACTIVITIES_STORE);
  return activities.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createLocalActivity(input: { description: string; agentId?: string; projectId?: string; type?: string }) {
  const activity: LocalActivity = {
    id: makeId("activity"),
    description: input.description.trim(),
    agentId: input.agentId ?? "celian",
    projectId: input.projectId,
    type: input.type ?? "workspace_activity",
    createdAt: new Date().toISOString(),
  };
  return put(ACTIVITIES_STORE, activity);
}

export async function getLocalWorkspaceSnapshot(): Promise<LocalWorkspaceSnapshot> {
  const [projects, tasks, activities] = await Promise.all([listLocalProjects(), listLocalTasks(), listLocalActivities()]);
  return { projects, tasks, activities };
}

export function isLocalTaskDueToday(task: LocalTask, date = new Date()) {
  if (!task.dueAt) return false;
  const dueDate = new Date(task.dueAt);
  return dueDate.toDateString() === date.toDateString();
}

export type { LocalProjectStatus, LocalTaskPriority, LocalTaskStatus };
