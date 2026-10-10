import { projects } from "@/lib/mock-data";
import { ProgressBar } from "@/components/ui";
import { Icon } from "@/components/icon";

export default function ProjectsPage() {
  return <div className="standalone-page"><div className="standalone-head"><div><div className="eyebrow">Workspace / Projets</div><h1>Vos projets</h1><p>Chaque projet garde son contexte, ses fichiers, ses tâches et sa mémoire.</p></div><button className="primary-button"><Icon name="plus" size={16} />Nouveau projet</button></div><div className="project-directory">{projects.map((project) => <article className="project-directory-card" key={project.id}><div className="project-cover" style={{ backgroundImage: `url(${project.image})` }}><span>{project.status}</span></div><div className="project-directory-body"><div><h2>{project.name}</h2><p>{project.meta}</p></div><button className="icon-button"><Icon name="more" size={17} /></button><ProgressBar value={project.progress} /><div className="project-meta"><span>{project.progress}% terminé</span><span>Dernière activité aujourd’hui</span></div></div></article>)}</div></div>;
}
