"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { completeGoogleRedirect, sendMagicLink, signInWithGoogle, subscribeToAuthState } from "@/lib/firebase/auth";
import { firebaseConfigured } from "@/lib/firebase/client";
import { Icon } from "./icon";
import { GradientText } from "./ui/gradient-text";
import { LiquidMetalButton } from "./ui/liquid-metal-button";

export function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const nextPath = (() => {
    const requested = searchParams.get("next");
    return requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  })();

  const goToWorkspace = useCallback(() => {
    router.replace(nextPath);
  }, [nextPath, router]);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAuthState((user) => {
      if (active && user) goToWorkspace();
    });
    completeGoogleRedirect()
      .then((result) => {
        if (active && result?.user) {
          setStatus("Connexion réussie. Redirection…");
          goToWorkspace();
        }
      })
      .catch((error) => {
        if (active) setStatus(error instanceof Error ? error.message : "Impossible de finaliser la connexion Google.");
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [goToWorkspace]);

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
      const result = await signInWithGoogle();
      setStatus("Redirection vers Google…");
      // Sur desktop, le popup revient dans cette page ; sur mobile, la
      // redirection est traitée par l’effet ci-dessus au retour de Google.
      if (result) goToWorkspace();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Impossible de se connecter avec Google.");
    } finally {
      setLoading(false);
    }
  }

  if (!firebaseConfigured) return <div className="auth-message">Firebase n’est pas encore configuré dans les variables d’environnement.</div>;

  return <div className="auth-panel"><div className="auth-brand"><span className="auth-brand-mark"><Image className="brand-logo-image" src="/branding/agents-logo.png" alt="" aria-hidden="true" width={74} height={74} /></span><strong>Agents</strong></div><h1>Votre <GradientText as="span">espace de travail augmenté</GradientText></h1><p>Connectez-vous pour retrouver vos projets, tâches et conversations.</p><button type="button" className="google-button" onClick={google} disabled={loading} aria-busy={loading}><Icon name="user" size={16} />Continuer avec Google</button><div className="auth-divider"><span>ou avec votre email</span></div><form onSubmit={submit}><label htmlFor="auth-email">Adresse email</label><input id="auth-email" name="email" autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.fr" required /><LiquidMetalButton className="auth-submit-liquid" fullWidth type="submit" disabled={loading} label={loading ? "Envoi en cours…" : "Recevoir un lien magique"} /></form>{status ? <div className="auth-status" role="status" aria-live="polite">{status}</div> : null}<small>Connexion sécurisée par Firebase Authentication.</small></div>;
}
