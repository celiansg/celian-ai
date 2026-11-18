import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { firestore } from "./client";
import type { FirebaseProject, FirebaseTask, TaskStatus } from "./types";

function requireFirestore() {
  if (!firestore) throw new Error("Firestore n’est pas configuré.");
  return firestore;
}

function withId<T extends DocumentData>(snapshot: { id: string; data: () => T }): T & { id: string } {
  return { id: snapshot.id, ...snapshot.data() };
}

export async function listProjects(userId: string): Promise<FirebaseProject[]> {
  const db = requireFirestore();
  const snapshot = await getDocs(query(collection(db, "projects"), where("userId", "==", userId)));
  return snapshot.docs.map((item) => withId(item) as FirebaseProject).sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")));
}

export async function createProject(userId: string, input: Pick<FirebaseProject, "name" | "description">) {
  const db = requireFirestore();
  return addDoc(collection(db, "projects"), { ...input, userId, status: "active", progress: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function listTasks(userId: string): Promise<FirebaseTask[]> {
  const db = requireFirestore();
  const snapshot = await getDocs(query(collection(db, "tasks"), where("userId", "==", userId), limit(100)));
  return snapshot.docs.map((item) => withId(item) as FirebaseTask).sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")));
}

export async function deleteProject(projectId: string) {
  await deleteDoc(doc(requireFirestore(), "projects", projectId));
}

export async function createTask(userId: string, input: Pick<FirebaseTask, "title" | "description" | "projectId" | "assignedAgentId" | "priority" | "dueAt">) {
  const cleanInput = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
  return addDoc(collection(requireFirestore(), "tasks"), { ...cleanInput, userId, status: "todo", createdAt: serverTimestamp() });
}

export async function updateTask(taskId: string, input: Partial<Pick<FirebaseTask, "title" | "description" | "projectId" | "assignedAgentId" | "priority" | "status" | "dueAt">>) {
  await updateDoc(doc(requireFirestore(), "tasks", taskId), input);
}

export async function deleteTask(taskId: string) {
  await deleteDoc(doc(requireFirestore(), "tasks", taskId));
}

export async function listActivities(userId: string) {
  const snapshot = await getDocs(query(collection(requireFirestore(), "activities"), where("userId", "==", userId), limit(50)));
  return snapshot.docs.map((item) => withId(item)).sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")));
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const db = requireFirestore();
  await updateDoc(doc(db, "tasks", taskId), { status });
}

export async function createActivity(userId: string, description: string, agentId = "celian", projectId?: string) {
  const db = requireFirestore();
  return addDoc(collection(db, "activities"), { userId, agentId, projectId: projectId ?? null, type: "agent_activity", description, metadata: {}, createdAt: serverTimestamp() });
}
