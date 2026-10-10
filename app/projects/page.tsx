import { EmptyState } from "@/components/ui";

export default function ProjectsPage() {
  return <div className="standalone-page"><div className="standalone-head"><div><div className="eyebrow">Workspace / Projets</div><h1>Vos projets</h1><p>Chaque projet garde son contexte, ses fichiers, ses tâches et sa mémoire.</p></div></div><div className="project-directory"><EmptyState icon="folder" title="Aucun projet pour le moment" text="Créez votre premier projet pour rassembler son contexte, ses fichiers et ses tâches." /></div></div>;
}
