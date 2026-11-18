import {
  GoogleAuthProvider,
  browserLocalPersistence,
  isSignInWithEmailLink,
  onAuthStateChanged,
  getRedirectResult,
  setPersistence,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { firebaseAuth } from "./client";

const emailLinkSettings = {
  url: typeof window === "undefined" ? "http://localhost:3000/login" : `${window.location.origin}/login`,
  handleCodeInApp: true,
};

let persistencePromise: Promise<void> | null = null;

/**
 * Keep the Firebase session on the same browser across OAuth redirects.
 * This is especially important on iOS Safari, where relying on the SDK's
 * default persistence can make a successful Google callback look anonymous.
 */
async function ensureAuthPersistence() {
  if (!firebaseAuth) throw new Error("Firebase Auth n’est pas configuré.");
  persistencePromise ??= setPersistence(firebaseAuth, browserLocalPersistence);
  await persistencePromise;
}

export async function signInWithGoogle() {
  if (!firebaseAuth) throw new Error("Firebase Auth n’est pas configuré.");
  await ensureAuthPersistence();
  const provider = new GoogleAuthProvider();
  try {
    // Popup first keeps the Firebase session on the app origin and avoids
    // Safari/PWA redirect storage restrictions when the browser allows it.
    return await signInWithPopup(firebaseAuth, provider);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    const canFallbackToRedirect = [
      "auth/popup-blocked",
      "auth/popup-closed-by-user",
      "auth/cancelled-popup-request",
      "auth/operation-not-supported-in-this-environment",
    ].some((candidate) => code.includes(candidate));
    if (!canFallbackToRedirect) throw error;

    // Some mobile browsers block popups even from a direct tap. Keep the
    // redirect path as a fallback for those environments.
    await signInWithRedirect(firebaseAuth, provider);
    return null;
  }
}

export async function completeGoogleRedirect() {
  if (!firebaseAuth) return null;
  await ensureAuthPersistence();
  await firebaseAuth.authStateReady();
  return getRedirectResult(firebaseAuth);
}

export async function sendMagicLink(email: string) {
  if (!firebaseAuth) throw new Error("Firebase Auth n’est pas configuré.");
  await ensureAuthPersistence();
  await sendSignInLinkToEmail(firebaseAuth, email, emailLinkSettings);
  window.localStorage.setItem("celian-ai-email-for-sign-in", email);
}

export async function completeMagicLink(url: string) {
  if (!firebaseAuth || !isSignInWithEmailLink(firebaseAuth, url)) return null;
  const email = window.localStorage.getItem("celian-ai-email-for-sign-in");
  if (!email) throw new Error("L’adresse email est nécessaire pour terminer la connexion.");
  const result = await signInWithEmailLink(firebaseAuth, email, url);
  window.localStorage.removeItem("celian-ai-email-for-sign-in");
  return result.user;
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  if (!firebaseAuth) return () => undefined;
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function logOut() {
  if (firebaseAuth) await signOut(firebaseAuth);
}
