import { Suspense } from "react";
import { AuthPanel } from "@/components/auth-panel";

export default function LoginPage() {
  return <main className="login-page"><Suspense fallback={<div className="auth-message">Préparation de la connexion…</div>}><AuthPanel /></Suspense></main>;
}
