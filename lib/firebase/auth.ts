import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  getRedirectResult,
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

export async function signInWithGoogle() {
  if (!firebaseAuth) throw new Error("Firebase Auth n’est pas configuré.");
  const provider = new GoogleAuthProvider();
  // Les navigateurs mobiles et les webviews intégrées bloquent fréquemment
  // les popups. La redirection conserve le même parcours utilisateur sans
  // dépendre d'une nouvelle fenêtre.
  const isMobile =
    typeof window !== "undefined" &&
    (window.matchMedia("(max-width: 768px)").matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

  if (isMobile) {
    await signInWithRedirect(firebaseAuth, provider);
    return null;
  }

  return signInWithPopup(firebaseAuth, provider);
}

export async function completeGoogleRedirect() {
  if (!firebaseAuth) return null;
  return getRedirectResult(firebaseAuth);
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
