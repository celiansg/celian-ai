import type { Metadata } from "next";
import { ProdBatPage } from "@/components/prod-bat-page";
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
        <p>Suivez le parcours qui correspond à votre besoin. Les outils intermédiaires sont facultatifs ; le BAT officiel se construit à la dernière étape.</p>
      </div>
      <div className="bat-intro-note"><strong>Le plus courant</strong><span>Contrôler le PDF → ajouter 3 mm → tracer si nécessaire → générer le BAT</span></div>
    </header>
    <nav className="bat-steps bat-steps--three" aria-label="Étapes de préparation">
      <a className="current" href="#prod-pdf-workspace"><span>1</span><strong>Importer</strong><small>Ouvrir le PDF client</small></a>
      <a href="#prod-action-rail"><span>2</span><strong>Contrôler</strong><small>Actions prépresse</small></a>
      <a href="#bat-generate"><span>3</span><strong>Créer le BAT</strong><small>Modèle officiel</small></a>
    </nav>
    <p className="bat-optional-note">Le fichier original reste inchangé. Les contrôles et préparations produisent des copies séparées avant la création du BAT officiel.</p>
    <ProdBatPage available={getBatTemplateStatus().available} version={mapping.version} initialProjectId={initialProjectId} />
  </div>;
}
