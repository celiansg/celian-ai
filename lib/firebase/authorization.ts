"use client";

import { firebaseAuth } from "./client";

export async function getAiAuthorizationHeaders(): Promise<Record<string, string>> {
  try {
    await firebaseAuth?.authStateReady();
    const token = await firebaseAuth?.currentUser?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
