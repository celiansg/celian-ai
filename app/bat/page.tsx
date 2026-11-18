import type { Metadata } from "next";
import { BatWorkspace } from "@/components/bat-workspace";
import { PreflightPanel } from "@/components/preflight-panel";
import { BleedPanel } from "@/components/bleed-panel";
import { ImpositionPanel } from "@/components/imposition-panel";
import { getBatTemplateStatus } from "@/lib/bat/template";
import mapping from "@/knowledge/templates/BAT-template.mapping.v1.json";

export const metadata: Metadata = { title: "Nouveau BAT | Agents" };
export const dynamic = "force-dynamic";

export default async function BatPage({ searchParams }: { searchParams: Promise<{ project?: string | string[] }> }) {
  const { project } = await searchParams;
  const initialProjectId = typeof project === "string" && project.length <= 128 ? project : undefined;
  return <div className="standalone-page bat-page">
    <header className="bat-intro">
      <div>
        <div className="eyebrow">Atelier prépresse</div>
        <h1>Préparer un fichier sans se perdre</h1>
        <p>Suivez le parcours qui correspond à votre besoin. Les trois premiers outils sont facultatifs ; le BAT officiel se construit à la dernière étape.</p>
      </div>
      <div className="bat-intro-note"><strong>Le plus courant</strong><span>Contrôler le PDF → ajouter 3 mm → générer le BAT</span></div>
    </header>
    <nav className="bat-steps" aria-label="Étapes de préparation">
      <a href="#bat-preflight"><span>1</span><strong>Contrôler</strong><small>Vérifier le fichier</small></a>
      <a href="#bat-bleed"><span>2</span><strong>Fond perdu</strong><small>Si nécessaire</small></a>
      <a href="#bat-imposition"><span>3</span><strong>Imposer</strong><small>Épreuve N-up</small></a>
      <a className="current" href="#bat-generate"><span>4</span><strong>Créer le BAT</strong><small>Modèle officiel</small></a>
    </nav>
    <p className="bat-optional-note">Besoin uniquement du modèle officiel ? Allez directement à <a href="#bat-generate">Créer le BAT</a>.</p>
    <div className="bat-tools"><PreflightPanel /><BleedPanel /><ImpositionPanel /><BatWorkspace available={getBatTemplateStatus().available} version={mapping.version} initialProjectId={initialProjectId} /></div>
  </div>;
}
