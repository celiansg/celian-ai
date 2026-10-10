"use client";

import { useState } from "react";
import { projects, tasks } from "@/lib/mock-data";
import { agents } from "@/lib/ai/agents";
import type { AgentRunEvent, AgentId, PendingAction } from "@/lib/ai/types";
import { AgentAvatar } from "./agent-avatar";
import { CommandBar } from "./command-bar";
import { Icon } from "./icon";
import { ProgressBar, SectionHeading } from "./ui";
import { PendingActionCard } from "./pending-action-card";

function formatAgent(agentId: AgentId) {
  return agents.find((agent) => agent.id === agentId)?.handle ?? "@Célian";
}

export function DashboardView() {
  const [runEvents, setRunEvents] = useState<AgentRunEvent[]>([]);
  const [runAnswer, setRunAnswer] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | undefined>();
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [checkedTasks, setCheckedTasks] = useState<string[]>(tasks.filter((task) => task.done).map((task) => task.id));

  async function runGoal(prompt: string) {
    setRunStatus("running");
    setRunAnswer("");
    setPendingAction(undefined);
    try {
      const response = await fetch("/api/agent/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal: prompt }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRunEvents(result.events ?? []);
      setRunAnswer(result.answer ?? "");
      setPendingAction(result.pendingAction);
      setRunStatus("completed");
    } catch {
      setRunStatus("error");
    }
  }

  function toggleTask(taskId: string) {
    setCheckedTasks((current) => current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]);
  }

  return <>
    <section className="welcome-section"><div><div className="eyebrow">Samedi 10 octobre 2026</div><h1>Bonjour Célian <span className="sun-mark">✦</span></h1><p className="welcome-summary">4 tâches aujourd’hui <span>·</span> 2 BAT en attente <span>·</span> Tout est sous contrôle.</p></div></section>
    <CommandBar onRun={runGoal} />

    {runStatus !== "idle" ? <section className={`run-panel ${runStatus}`}><div className="run-panel-head"><div><div className="eyebrow">Exécution en direct</div><h2>{runStatus === "running" ? "Célian organise votre demande" : runStatus === "error" ? "L’exécution a rencontré un problème" : "Demande traitée"}</h2></div><button className="icon-button" onClick={() => setRunStatus("idle")} aria-label="Fermer la trace"><Icon name="x" size={18} /></button></div>{runStatus === "running" ? <div className="run-loading"><span className="loading-pulse" /> Analyse du contexte, recherche des outils disponibles…</div> : <><div className="run-timeline">{runEvents.map((item) => <div key={item.id} className="run-event"><span className={`run-event-line event-${item.type}`}><Icon name={item.type === "tool_called" ? "zap" : item.type === "handoff_started" ? "arrowRight" : item.type === "agent_completed" ? "check" : "sparkles"} size={13} /></span><div><strong>{formatAgent(item.agentId)}</strong><p>{item.summary.replace(formatAgent(item.agentId), "").trim()}</p></div></div>)}</div>{runAnswer ? <div className="run-answer"><span className="answer-check"><Icon name="check" size={15} /></span><p>{runAnswer}</p></div> : null}{pendingAction ? <PendingActionCard action={pendingAction} onResolved={() => undefined} /> : null}</>}</section> : null}

    <SectionHeading icon="target" title="Aujourd’hui" action="Voir tout" />
    <section className="today-grid">{[
      { number: "1", title: "BAT client", tag: "Priorité haute", description: "Finaliser et envoyer le BAT pour le client Nivo.", due: "Échéance aujourd’hui", color: "rose", image: projects[0].image },
      { number: "2", title: "Catalogue Menhirs", tag: "Priorité haute", description: "Finaliser la maquette du catalogue et préparer l’envoi.", due: "Échéance aujourd’hui", color: "blue", image: projects[1].image },
      { number: "3", title: "Projet bijoux", tag: "Priorité moyenne", description: "Préparer les visuels et sélectionner les matières.", due: "Échéance demain", color: "violet", image: projects[4].image },
    ].map((item) => <article className="today-card" key={item.number}><div className={`task-number ${item.color}`}>{item.number}</div><div className="today-card-copy"><div className="today-card-title">{item.title}</div><span className={`priority-tag ${item.color}`}>{item.tag}</span><p>{item.description}</p><div className={`due-text ${item.color}`}><Icon name="clock" size={14} />{item.due}</div></div><div className="today-image" style={{ backgroundImage: `url(${item.image})` }} /></article>)}</section>

    <SectionHeading icon="bot" title="Mes agents" action="Voir tous les agents" />
    <section className="agents-grid">{agents.map((agent) => <article key={agent.id} className="agent-card"><div className="agent-card-icon" style={{ backgroundColor: agent.color }}><Icon name={agent.icon} size={22} /></div><div className="agent-card-name">{agent.handle} <span className="online-dot" /></div><div className="agent-card-role">{agent.role}</div><p>{agent.description}</p></article>)}</section>

    <div className="dashboard-bottom-grid"><section className="panel projects-panel"><SectionHeading icon="folder" title="Projets récents" action="Voir tous" /><div className="project-list">{projects.slice(0, 4).map((project) => <div className="project-row" key={project.id}><div className="project-thumb" style={{ backgroundImage: `url(${project.image})` }} /><div className="project-row-main"><strong>{project.name}</strong><span>{project.meta}</span></div><div className="project-progress"><ProgressBar value={project.progress} /><b>{project.progress}%</b></div><button className="icon-button row-menu" aria-label={`Options ${project.name}`}><Icon name="more" size={17} /></button></div>)}</div></section><section className="panel tasks-panel"><SectionHeading icon="checkCircle" title="Tâches du jour" action="Voir toutes" /><div className="task-list">{tasks.map((task) => { const done = checkedTasks.includes(task.id); return <div className={`task-row ${done ? "done" : ""}`} key={task.id}><button className={`task-checkbox ${done ? "checked" : ""}`} onClick={() => toggleTask(task.id)} aria-label={done ? `Rouvrir ${task.title}` : `Terminer ${task.title}`}>{done ? <Icon name="check" size={12} /> : null}</button><div className="task-row-title"><strong>{task.title}</strong><span>{task.time}</span></div><span className={`agent-pill agent-pill-${task.agent}`}>{formatAgent(task.agent)}</span><button className="icon-button row-menu" aria-label={`Options ${task.title}`}><Icon name="more" size={17} /></button></div>})}</div></section></div>

    <section className="assistant-note"><AgentAvatar agentId="celian" size="md" /><div className="assistant-note-copy"><strong>J’ai analysé vos éléments du jour et préparé les actions suivantes :</strong><ul><li>Les réponses aux mails clients sont prêtes (3 brouillons).</li><li>Le BAT Nivo est finalisé et prêt à être envoyé.</li><li>Une première maquette du catalogue Menhirs est disponible.</li><li>J’ai planifié vos tâches et bloqué les créneaux nécessaires dans votre agenda.</li></ul></div><span className="note-time">Il y a 5 min</span><button className="assistant-followup"><Icon name="paperclip" size={14} />Demande-moi d’ajuster, d’approfondir ou de lancer une nouvelle tâche…<Icon name="send" size={15} /></button></section>
  </>;
}
