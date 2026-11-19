"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { agents } from "@/lib/ai/agents";
import type { AgentRunEvent, AgentId, PendingAction } from "@/lib/ai/types";
import { AgentAvatar } from "./agent-avatar";
import { CommandBar } from "./command-bar";
import { Icon } from "./icon";
import { EmptyState, SectionHeading } from "./ui";
import { PendingActionCard } from "./pending-action-card";
import { GradientText } from "./ui/gradient-text";
import { createWorkspaceActivity, listWorkspaceProjects, listWorkspaceTasks } from "@/lib/workspace/repository";
import type { LocalProject, LocalTask } from "@/lib/local-workspace/types";
import { listLocalAgentRuns, saveLocalAgentRun } from "@/lib/local-workspace/indexed-db";
import type { LocalAgentRun } from "@/lib/local-workspace/types";
import { getAiAuthorizationHeaders } from "@/lib/firebase/authorization";

function formatAgent(agentId: AgentId) {
  return agents.find((agent) => agent.id === agentId)?.handle ?? "@Célian";
}

export function DashboardView() {
  const [runEvents, setRunEvents] = useState<AgentRunEvent[]>([]);
  const [runAnswer, setRunAnswer] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | undefined>();
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [lastGoal, setLastGoal] = useState("");
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [recentRuns, setRecentRuns] = useState<LocalAgentRun[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);

  async function refreshWorkspace() {
    try {
      const [nextProjects, nextTasks, nextRuns] = await Promise.all([listWorkspaceProjects(), listWorkspaceTasks(), listLocalAgentRuns()]);
      setProjects(nextProjects);
      setTasks(nextTasks);
      setRecentRuns(nextRuns);
    } finally {
      setWorkspaceLoading(false);
    }
  }

  useEffect(() => { void refreshWorkspace(); }, []);

  async function runGoal(prompt: string) {
    setLastGoal(prompt);
    setRunStatus("running");
    setRunAnswer("");
    setPendingAction(undefined);
    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getAiAuthorizationHeaders() },
        body: JSON.stringify({ goal: prompt }),
      });
      const result = await response.json();
      if (!response.ok) {
        setRunAnswer(typeof result.error === "string" ? result.error : "La demande n’a pas pu aboutir.");
        setRunStatus("error");
        return;
      }
      setRunEvents(result.events ?? []);
      setRunAnswer(result.answer ?? "");
      setPendingAction(result.pendingAction);
      setRunStatus("completed");
      try {
        const savedRun = await saveLocalAgentRun({ goal: prompt, agentId: "celian", status: result.status, answer: result.answer ?? "", events: result.events ?? [], pendingAction: result.pendingAction });
        setRecentRuns((current) => [savedRun, ...current]);
      } catch {
        // Une indisponibilité du stockage local ne transforme pas un run IA réussi en erreur.
      }
      await createWorkspaceActivity({ description: `@Célian a traité : ${prompt}`, agentId: "celian" });
      await refreshWorkspace();
    } catch {
      setRunAnswer("La demande n’a pas pu aboutir. Vérifiez la configuration du provider puis réessayez.");
      setRunStatus("error");
    }
  }

  const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(new Date());
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const todayTasks = tasks.filter((task) => task.status !== "completed" && (!task.dueAt || (new Date(task.dueAt) >= todayStart && new Date(task.dueAt) < tomorrowStart)));
  const openTaskCount = tasks.filter((task) => task.status !== "completed" && task.status !== "archived").length;

  return <>
    <section className="welcome-section"><div><div className="eyebrow">{today.charAt(0).toUpperCase() + today.slice(1)}</div><h1>Bonjour <GradientText as="span">Célian</GradientText> <span className="sun-mark">✦</span></h1><p className="welcome-summary">{todayTasks.length} tâche{todayTasks.length > 1 ? "s" : ""} aujourd’hui <span>·</span> {openTaskCount} tâche{openTaskCount > 1 ? "s" : ""} ouverte{openTaskCount > 1 ? "s" : ""} <span>·</span> {projects.length} projet{projects.length > 1 ? "s" : ""}</p></div></section>
    <CommandBar onRun={runGoal} />

    {runStatus !== "idle" ? <section className={`run-panel ${runStatus}`} role="status" aria-live="polite"><div className="run-panel-head"><div><div className="eyebrow">Exécution en direct</div><h2>{runStatus === "running" ? "Célian organise votre demande" : runStatus === "error" ? "L’exécution a rencontré un problème" : "Demande traitée"}</h2></div><button type="button" className="icon-button" onClick={() => setRunStatus("idle")} aria-label="Fermer la trace"><Icon name="x" size={18} /></button></div>{runStatus === "running" ? <div className="run-loading"><span className="loading-pulse" aria-hidden="true" /> Analyse du contexte, recherche des outils disponibles…</div> : <>{runStatus === "error" ? <div className="run-answer run-error-message"><span className="answer-check"><Icon name="x" size={15} /></span><div><p>{runAnswer}</p>{lastGoal ? <button type="button" className="text-action" onClick={() => void runGoal(lastGoal)}>Réessayer <Icon name="arrowRight" size={15} /></button> : null}</div></div> : <><div className="run-timeline">{runEvents.map((item) => <div key={item.id} className="run-event"><span className={`run-event-line event-${item.type}`}><Icon name={item.type === "tool_called" ? "zap" : item.type === "handoff_started" ? "arrowRight" : item.type === "agent_completed" ? "check" : "sparkles"} size={13} /></span><div><strong>{formatAgent(item.agentId)}</strong><p>{item.summary.replace(formatAgent(item.agentId), "").trim()}</p></div></div>)}</div>{runAnswer ? <div className="run-answer"><span className="answer-check"><Icon name="check" size={15} /></span><p>{runAnswer}</p></div> : null}{pendingAction ? <PendingActionCard action={pendingAction} onResolved={() => undefined} /> : null}</>}</>}</section> : null}

    <SectionHeading icon="target" title="Aujourd’hui" action={todayTasks.length > 0 ? "Voir les tâches" : undefined} href="/tasks" />
    <section className="today-grid">{workspaceLoading ? <div className="workspace-loading">Chargement de votre espace…</div> : todayTasks.length === 0 ? <EmptyState icon="target" title="Aucune priorité pour le moment" text="Ajoutez une tâche pour voir ici ce qui mérite votre attention aujourd’hui." action={<Link className="empty-state-action" href="/tasks">Créer une tâche</Link>} /> : <div className="dashboard-list">{todayTasks.slice(0, 5).map((task) => <div className="dashboard-list-row" key={task.id}><span className="dashboard-list-dot" /><div><strong>{task.title}</strong><span>{task.projectId ? "Projet associé" : "Sans projet"}</span></div><span className={`priority-label ${task.priority}`}>{task.priority === "high" ? "Haute" : task.priority === "low" ? "Basse" : "Moyenne"}</span></div>)}</div>}</section>

    <SectionHeading icon="bot" title="Mes agents" action="Voir tous les agents" href="/agents" />
    <section className="agents-grid">{agents.map((agent) => <Link href={`/agents/${agent.id}`} key={agent.id} className="agent-card" aria-label={`Ouvrir ${agent.handle}`}><AgentAvatar agentId={agent.id} size="md" /><div className="agent-card-name">{agent.handle} <span className="online-dot" /></div><div className="agent-card-role">{agent.role}</div><p>{agent.description}</p></Link>)}</section>

    {recentRuns.length > 0 && <section className="panel run-history-panel"><SectionHeading icon="activity" title="Dernières exécutions" action="Historique local" /><div className="run-history-list">{recentRuns.slice(0, 5).map((run) => <article className="run-history-row" key={run.id}><span className={`run-history-status ${run.status}`} aria-label={run.status} /><div><strong>{run.goal}</strong><p>{run.events.length} événement{run.events.length > 1 ? "s" : ""} · {run.status === "completed" ? "terminée" : run.status === "waiting_for_approval" ? "en attente de validation" : "échouée"}</p></div><time dateTime={run.createdAt}>{new Date(run.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</time></article>)}</div></section>}

    <div className="dashboard-bottom-grid"><section className="panel projects-panel"><SectionHeading icon="folder" title="Projets récents" action={projects.length > 0 ? "Voir les projets" : undefined} href="/projects" />{projects.length === 0 ? <EmptyState icon="folder" title="Aucun projet" text="Créez un projet pour rassembler vos fichiers, tâches et contexte." action={<Link className="empty-state-action" href="/projects">Créer un projet</Link>} /> : <div className="dashboard-list">{projects.slice(0, 4).map((project) => <div className="dashboard-list-row" key={project.id}><span className="dashboard-project-icon"><Icon name="folder" size={15} /></span><div><strong>{project.name}</strong><span>{project.progress}% · {project.status === "active" ? "Actif" : project.status}</span></div></div>)}</div>}</section><section className="panel tasks-panel"><SectionHeading icon="checkCircle" title="Tâches du jour" action={tasks.length > 0 ? "Voir les tâches" : undefined} href="/tasks" />{tasks.length === 0 ? <EmptyState icon="checkCircle" title="Aucune tâche" text="Créez une tâche pour garder la prochaine action visible." action={<Link className="empty-state-action" href="/tasks">Créer une tâche</Link>} /> : <div className="dashboard-list">{tasks.filter((task) => task.status !== "completed").slice(0, 5).map((task) => <div className="dashboard-list-row" key={task.id}><span className="dashboard-list-dot" /><div><strong>{task.title}</strong><span>{task.dueAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(new Date(task.dueAt)) : "Sans échéance"}</span></div></div>)}</div>}</section></div>
  </>;
}
