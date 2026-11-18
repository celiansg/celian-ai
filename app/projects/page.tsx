"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createWorkspaceProject, deleteWorkspaceProject, listWorkspaceProjects } from "@/lib/workspace/repository";
import type { LocalProject } from "@/lib/local-workspace/types";
import { EmptyState, ProgressBar } from "@/components/ui";
import { Icon } from "@/components/icon";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setError(null);
      setProjects(await listWorkspaceProjects());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger les projets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createWorkspaceProject({ name, description });
      setName("");
      setDescription("");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de créer le projet.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(project: LocalProject) {
    if (!window.confirm(`Supprimer le projet « ${project.name} » et ses tâches locales ?`)) return;
    try {
      await deleteWorkspaceProject(project.id);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de supprimer le projet.");
    }
  }

  return (
    <div className="standalone-page">
      <div className="standalone-head"><div><div className="eyebrow">Workspace / Projets</div><h1>Vos projets</h1><p>Chaque projet garde son contexte, ses fichiers, ses tâches et sa mémoire.</p></div></div>
      <section className="workspace-create-panel">
        <div><div className="eyebrow">Nouveau projet</div><h2>Commencer par un objectif concret</h2><p>Les données sont conservées localement sur cet appareil pour le moment.</p></div>
        <form className="workspace-create-form" onSubmit={submit}>
          <label>Nom du projet<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Refonte du catalogue" required maxLength={120} /></label>
          <label>Description <span>(facultatif)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contexte, résultat attendu, client…" maxLength={4000} rows={2} /></label>
          <button className="primary-action" type="submit" disabled={saving}>{saving ? "Création…" : "Créer le projet"}<Icon name="arrowRight" size={16} /></button>
        </form>
      </section>
      {error ? <div className="workspace-inline-error" role="alert">{error}</div> : null}
      <section className="project-directory">
        <div className="section-heading"><div className="section-heading-title"><span className="section-icon"><Icon name="folderKanban" size={17} /></span><h2>Projets locaux</h2></div><span className="workspace-count">{projects.length}</span></div>
        {loading ? <div className="workspace-loading">Chargement des projets…</div> : projects.length === 0 ? <EmptyState icon="folder" title="Aucun projet pour le moment" text="Créez votre premier projet pour rassembler son contexte, ses fichiers et ses tâches." /> : <div className="project-list">{projects.map((project) => <article className="workspace-project-card" key={project.id}><div className="workspace-project-card-top"><span className="workspace-project-icon"><Icon name="folder" size={19} /></span><div><h3>{project.name}</h3><p>{project.description || "Aucune description"}</p></div><button className="icon-button danger-hover" type="button" aria-label={`Supprimer ${project.name}`} onClick={() => void remove(project)}><Icon name="trash" size={16} /></button></div><div className="workspace-project-card-meta"><span>{project.status === "active" ? "Actif" : project.status}</span><span>{project.progress}%</span></div><ProgressBar value={project.progress} /><Link className="text-action" href={`/bat?project=${encodeURIComponent(project.id)}`} aria-label={`BAT du projet ${project.name}`}>Ouvrir les BAT</Link></article>)}</div>}
      </section>
    </div>
  );
}
