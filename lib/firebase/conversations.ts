"use client";

import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import type { UIMessage } from "ai";
import { firebaseAuth, firestore } from "./client";
import type { LocalConversation } from "../local-workspace/types";

const MAX_MESSAGES = 120;
const MAX_PARTS_JSON_LENGTH = 50_000;

function currentUser() {
  return firebaseAuth?.currentUser && firestore ? firebaseAuth.currentUser : null;
}

function safeMessageId(message: unknown, index: number) {
  if (typeof message === "object" && message !== null && "id" in message && typeof message.id === "string" && message.id.trim()) {
    return message.id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120);
  }
  return `message-${index}`;
}

function messageContent(message: unknown) {
  if (typeof message !== "object" || message === null) return "Message structuré";
  if ("content" in message && typeof message.content === "string" && message.content.trim()) return message.content.slice(0, 20_000);
  if ("parts" in message && Array.isArray(message.parts)) {
    const text = message.parts
      .filter((part): part is { type: "text"; text: string } => typeof part === "object" && part !== null && "type" in part && part.type === "text" && "text" in part && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (text) return text.slice(0, 20_000);
  }
  return "Message structuré";
}

function partsJson(message: unknown) {
  if (typeof message !== "object" || message === null || !("parts" in message) || !Array.isArray(message.parts)) return "[]";
  try {
    const encoded = JSON.stringify(message.parts);
    return encoded.length <= MAX_PARTS_JSON_LENGTH ? encoded : "[]";
  } catch {
    return "[]";
  }
}

function toCloudMessage(message: unknown, conversationId: string, index: number, userId: string) {
  const role = typeof message === "object" && message !== null && "role" in message && ["user", "assistant", "system", "tool"].includes(String(message.role))
    ? String(message.role)
    : "assistant";
  const id = safeMessageId(message, index);
  return {
    id: `${conversationId}-${index}-${id}`,
    data: {
      userId,
      conversationId,
      role,
      content: messageContent(message),
      metadata: { messageId: id, partsJson: partsJson(message) },
      sequence: index,
      createdAt: serverTimestamp(),
    },
  };
}

function fromCloudMessage(document: { data: () => Record<string, unknown> }) {
  const data = document.data();
  const metadata = data.metadata as { messageId?: unknown; partsJson?: unknown } | undefined;
  let parts: unknown[] = [];
  if (typeof metadata?.partsJson === "string") {
    try {
      const parsed = JSON.parse(metadata.partsJson) as unknown;
      if (Array.isArray(parsed)) parts = parsed;
    } catch {
      parts = [];
    }
  }
  const content = typeof data.content === "string" ? data.content : "";
  if (parts.length === 0 && content) parts = [{ type: "text", text: content }];
  return {
    id: typeof metadata?.messageId === "string" ? metadata.messageId : `cloud-${String(data.sequence ?? 0)}`,
    role: data.role === "user" || data.role === "system" || data.role === "tool" ? data.role : "assistant",
    parts,
  } as UIMessage;
}

export async function getCloudConversation(agentId: LocalConversation["agentId"], projectId?: string) {
  const user = currentUser();
  const db = firestore;
  if (!user || !db) return null;

  const conversationSnapshot = await getDocs(query(collection(db, "conversations"), where("userId", "==", user.uid), limit(100)));
  const conversation = conversationSnapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as { id: string; agentId?: unknown; projectId?: unknown; title?: unknown; updatedAt?: unknown })
    .filter((item) => item.agentId === agentId && (item.projectId ?? undefined) === projectId)
    .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")))[0];
  if (!conversation) return null;

  const messagesSnapshot = await getDocs(query(
    collection(db, "messages"),
    where("userId", "==", user.uid),
    where("conversationId", "==", conversation.id),
  ));
  const messages = messagesSnapshot.docs
    .sort((left, right) => Number(left.data().sequence ?? 0) - Number(right.data().sequence ?? 0))
    .map(fromCloudMessage);

  return {
    id: conversation.id,
    agentId,
    projectId,
    title: typeof conversation.title === "string" ? conversation.title : `Conversation avec ${agentId}`,
    messages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies LocalConversation;
}

export async function saveCloudConversation(input: { agentId: LocalConversation["agentId"]; projectId?: string; title: string; messages: unknown[] }) {
  const user = currentUser();
  const db = firestore;
  if (!user || !db) return null;

  const existing = await getCloudConversation(input.agentId, input.projectId);
  const conversationId = existing?.id ?? doc(collection(db, "conversations")).id;
  const conversationReference = doc(db, "conversations", conversationId);
  const conversationData: Record<string, unknown> = {
    userId: user.uid,
    agentId: input.agentId,
    title: input.title.trim().slice(0, 160) || "Conversation sans titre",
    updatedAt: serverTimestamp(),
  };
  if (input.projectId) conversationData.projectId = input.projectId;
  if (!existing) conversationData.createdAt = serverTimestamp();

  const messages = input.messages.slice(-MAX_MESSAGES);
  const currentMessagesSnapshot = await getDocs(query(
    collection(db, "messages"),
    where("userId", "==", user.uid),
    where("conversationId", "==", conversationId),
  ));
  const batch = writeBatch(db);
  batch.set(conversationReference, conversationData, { merge: true });
  const nextIds = new Set<string>();
  const existingMessageIds = new Set(currentMessagesSnapshot.docs.map((item) => item.id));
  messages.forEach((message, index) => {
    const cloudMessage = toCloudMessage(message, conversationId, index, user.uid);
    nextIds.add(cloudMessage.id);
    const messageData: Record<string, unknown> = { ...cloudMessage.data };
    if (existingMessageIds.has(cloudMessage.id)) delete messageData.createdAt;
    batch.set(doc(db, "messages", cloudMessage.id), messageData, { merge: true });
  });
  currentMessagesSnapshot.docs.forEach((item) => {
    if (!nextIds.has(item.id)) batch.delete(item.ref);
  });
  await batch.commit();
  return conversationId;
}
