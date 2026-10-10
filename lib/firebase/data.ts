import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
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
  const snapshot = await getDocs(query(collection(db, "projects"), where("userId", "==", userId), orderBy("updatedAt", "desc")));
  return snapshot.docs.map((item) => withId(item) as FirebaseProject);
}

export async function createProject(userId: string, input: Pick<FirebaseProject, "name" | "description">) {
  const db = requireFirestore();
  return addDoc(collection(db, "projects"), { ...input, userId, status: "active", progress: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function listTasks(userId: string): Promise<FirebaseTask[]> {
  const db = requireFirestore();
  const snapshot = await getDocs(query(collection(db, "tasks"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(50)));
  return snapshot.docs.map((item) => withId(item) as FirebaseTask);
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const db = requireFirestore();
  await updateDoc(doc(db, "tasks", taskId), { status });
}

export async function createActivity(userId: string, description: string, agentId = "celian", projectId?: string) {
  const db = requireFirestore();
  return addDoc(collection(db, "activities"), { userId, agentId, projectId: projectId ?? null, type: "agent_activity", description, metadata: {}, createdAt: serverTimestamp() });
}
