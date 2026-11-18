"use client";

import { ReactNode, useState } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { RightRail } from "./right-rail";
import { firebaseAuth, firebaseConfigured } from "@/lib/firebase/client";
import { subscribeToAuthState } from "@/lib/firebase/auth";

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  // Un workspace connecté reste privé par défaut dès que Firebase est configuré.
  // La valeur "false" permet uniquement de désactiver explicitement la garde
  // pour un environnement local de démonstration.
  const authRequired =
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_REQUIRED !== "false";
  const [authReady, setAuthReady] = useState(!authRequired);
  const [authenticated, setAuthenticated] = useState(!authRequired && !firebaseConfigured);

  useEffect(() => {
    if (!authRequired || !firebaseConfigured) {
      setAuthReady(true);
      return;
    }
    let active = true;
    let unsubscribe: (() => void) | undefined;

    // Wait for Firebase to restore browser persistence before deciding that
    // a freshly completed OAuth redirect is anonymous.
    void firebaseAuth?.authStateReady().then(() => {
      if (!active) return;
      unsubscribe = subscribeToAuthState((user) => {
        if (!active) return;
        setAuthenticated(Boolean(user));
        setAuthReady(true);
      });
    }).catch(() => {
      if (active) setAuthReady(true);
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [authRequired]);

  useEffect(() => {
    if (authRequired && firebaseConfigured && authReady && !authenticated && pathname !== "/login") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [authReady, authRequired, authenticated, pathname, router]);

  if (pathname === "/login") return <>{children}</>;
  if (authRequired && !firebaseConfigured) return <div className="auth-gate"><strong>Authentification requise</strong><p>Firebase Auth doit être configuré avant d’ouvrir cet espace privé.</p></div>;
  if (authRequired && (!authReady || !authenticated)) {
    return <div className="auth-gate" role="status">Vérification de la session…</div>;
  }
  const isDashboard = pathname === "/";
  return <><a className="skip-link" href="#main-content">Aller au contenu principal</a><div className="app-shell"><Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /><div className="workspace"><Topbar onMenu={() => setSidebarOpen(true)} /><div className={`workspace-grid ${isDashboard ? "" : "route-grid"}`}><main id="main-content" className={`main-content ${isDashboard ? "" : "route-main"}`}>{children}</main>{isDashboard ? <RightRail /> : null}</div></div></div></>;
}
