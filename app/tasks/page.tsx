"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { agents } from "@/lib/ai/agents";
import { createWorkspaceTask, deleteWorkspaceTask, listWorkspaceProjects, listWorkspaceTasks, updateWorkspaceTask } from "@/lib/workspace/repository";
import type { LocalProject, LocalTask, LocalTaskPriority } from "@/lib/local-workspace/types";
import { EmptyState } from "@/components/ui";
import { Icon } from "@/components/icon";

type TaskFilter = "today" | "upcoming" | "completed";

export default function TasksPage() {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("today");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [agentId, setAgentId] = useState("celian");
  const [priority, setPriority] = useState<LocalTaskPriority>("medium");
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setError(null);
      const [nextTasks, nextProjects] = await Promise.all([listWorkspaceTasks(), listWorkspaceProjects()]);
      setTasks(nextTasks);
      setProjects(nextProjects);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger les tâches.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createWorkspaceTask({ title, projectId, assignedAgentId: agentId, priority, dueAt });
      setTitle("");
      setDueAt("");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de créer la tâche.");
    } finally {
      setSaving(false);
    }
  }

  const visibleTasks = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    return tasks.filter((task) => {
      if (filter === "completed") return task.status === "completed";
      if (task.status === "completed" || task.status === "archived") return false;
      if (filter === "today") {
        if (!task.dueAt) return true;
        const due = new Date(task.dueAt).getTime();
        return due >= start && due < end;
      }
      if (!task.dueAt) return true;
      return new Date(task.dueAt).getTime() >= end;
    });
  }, [filter, tasks]);

  async function toggle(task: LocalTask) {
    await updateWorkspaceTask(task.id, { status: task.status === "completed" ? "todo" : "completed" });
    await refresh();
  }

  async function remove(task: LocalTask) {
    if (!window.confirm(`Supprimer la tâche « ${task.title} » ?`)) return;
    await deleteWorkspaceTask(task.id);
    await refresh();
  }

  const projectName = (id?: string) => projects.find((project) => project.id === id)?.name ?? "Sans projet";
  const agentName = (id?: string) => agents.find((agent) => agent.id === id)?.handle ?? "@Célian";

  return <div className="standalone-page"><div className="standalone-head"><div><div className="eyebrow">Workspace / Tâches</div><h1>Les tâches qui font avancer les projets</h1><p>Une vue simple sur ce qui est à faire maintenant, bientôt ou déjà terminé.</p></div></div>
    <section className="workspace-create-panel"><div><div className="eyebrow">Nouvelle tâche</div><h2>Transformer une intention en prochaine action</h2><p>Les tâches sont persistées localement et pourront ensuite être synchronisées avec Firebase.</p></div><form className="workspace-task-form" onSubmit={submit}><label>Tâche<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Vérifier les dimensions du BAT" required maxLength={200} /></label><label>Projet<select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Sans projet</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>Agent<select value={agentId} onChange={(event) => setAgentId(event.target.value)}>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.handle}</option>)}</select></label><label>Priorité<select value={priority} onChange={(event) => setPriority(event.target.value as LocalTaskPriority)}><option value="low">Basse</option><option value="medium">Moyenne</option><option value="high">Haute</option></select></label><label>Échéance<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label><button className="primary-action" type="submit" disabled={saving}>{saving ? "Création…" : "Créer la tâche"}<Icon name="arrowRight" size={16} /></button></form></section>
    {error ? <div className="workspace-inline-error" role="alert">{error}</div> : null}
    <section className="full-task-list"><div className="task-filter-tabs" role="tablist" aria-label="Filtrer les tâches">{(["today", "upcoming", "completed"] as TaskFilter[]).map((item) => <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)} role="tab" aria-selected={filter === item}>{item === "today" ? "Aujourd’hui" : item === "upcoming" ? "À venir" : "Terminées"}</button>)}</div>{loading ? <div className="workspace-loading">Chargement des tâches…</div> : visibleTasks.length === 0 ? <EmptyState icon="checkCircle" title={filter === "completed" ? "Aucune tâche terminée" : "Aucune tâche dans cette vue"} text="Créez une tâche ou changez de filtre pour continuer." /> : <div className="task-list">{visibleTasks.map((task) => <article className={`workspace-task-row priority-${task.priority}`} key={task.id}><button type="button" className={`task-check ${task.status === "completed" ? "checked" : ""}`} onClick={() => void toggle(task)} aria-label={task.status === "completed" ? `Rouvrir ${task.title}` : `Terminer ${task.title}`}><Icon name="check" size={14} /></button><div className="task-row-main"><strong className={task.status === "completed" ? "completed" : ""}>{task.title}</strong><div><span>{projectName(task.projectId)}</span><span>{agentName(task.assignedAgentId)}</span>{task.dueAt ? <span>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(task.dueAt))}</span> : null}</div></div><span className={`priority-label ${task.priority}`}>{task.priority === "high" ? "Haute" : task.priority === "low" ? "Basse" : "Moyenne"}</span><button className="icon-button danger-hover" type="button" aria-label={`Supprimer ${task.title}`} onClick={() => void remove(task)}><Icon name="trash" size={15} /></button></article>)}</div>}</section></div>;
}
