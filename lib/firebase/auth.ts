import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { firebaseAuth } from "./client";

const emailLinkSettings = {
  url: typeof window === "undefined" ? "http://localhost:3000/login" : `${window.location.origin}/login`,
  handleCodeInApp: true,
};

export async function signInWithGoogle() {
  if (!firebaseAuth) throw new Error("Firebase Auth n’est pas configuré.");
  return signInWithPopup(firebaseAuth, new GoogleAuthProvider());
}

export async function sendMagicLink(email: string) {
  if (!firebaseAuth) throw new Error("Firebase Auth n’est pas configuré.");
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
