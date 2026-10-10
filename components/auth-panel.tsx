"use client";

import { FormEvent, useState } from "react";
import { sendMagicLink, signInWithGoogle } from "@/lib/firebase/auth";
import { firebaseConfigured } from "@/lib/firebase/client";
import { Icon } from "./icon";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendMagicLink(email.trim());
      setStatus("Le lien de connexion a été envoyé. Vérifiez votre boîte mail.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Impossible d’envoyer le lien.");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    try {
      await signInWithGoogle();
      setStatus("Connexion réussie.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Impossible de se connecter avec Google.");
    } finally {
      setLoading(false);
    }
  }

  if (!firebaseConfigured) return <div className="auth-message">Firebase n’est pas encore configuré dans les variables d’environnement.</div>;

  return <div className="auth-panel"><div className="auth-brand"><span><Icon name="sparkles" size={19} /></span><strong>Célian AI</strong></div><h1>Votre espace de travail augmenté</h1><p>Connectez-vous pour retrouver vos projets, tâches et conversations.</p><button className="google-button" onClick={google} disabled={loading}><Icon name="user" size={16} />Continuer avec Google</button><div className="auth-divider"><span>ou avec votre email</span></div><form onSubmit={submit}><label htmlFor="auth-email">Adresse email</label><input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.fr" required /><button className="primary-button auth-submit" type="submit" disabled={loading}>{loading ? "Envoi en cours…" : "Recevoir un lien magique"}</button></form>{status ? <div className="auth-status">{status}</div> : null}<small>Connexion sécurisée par Firebase Authentication.</small></div>;
}
