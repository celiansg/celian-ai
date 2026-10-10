"use client";

import { useState } from "react";
import { agents } from "@/lib/ai/agents";
import type { AgentRunEvent, AgentId, PendingAction } from "@/lib/ai/types";
import { AgentAvatar } from "./agent-avatar";
import { CommandBar } from "./command-bar";
import { Icon } from "./icon";
import { EmptyState, SectionHeading } from "./ui";
import { PendingActionCard } from "./pending-action-card";

function formatAgent(agentId: AgentId) {
  return agents.find((agent) => agent.id === agentId)?.handle ?? "@Célian";
}

export function DashboardView() {
  const [runEvents, setRunEvents] = useState<AgentRunEvent[]>([]);
  const [runAnswer, setRunAnswer] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | undefined>();
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "completed" | "error">("idle");

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

  const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(new Date());

  return <>
    <section className="welcome-section"><div><div className="eyebrow">{today.charAt(0).toUpperCase() + today.slice(1)}</div><h1>Bonjour Célian <span className="sun-mark">✦</span></h1><p className="welcome-summary">0 tâche aujourd’hui <span>·</span> 0 action en attente <span>·</span> Votre espace est prêt.</p></div></section>
    <CommandBar onRun={runGoal} />

    {runStatus !== "idle" ? <section className={`run-panel ${runStatus}`}><div className="run-panel-head"><div><div className="eyebrow">Exécution en direct</div><h2>{runStatus === "running" ? "Célian organise votre demande" : runStatus === "error" ? "L’exécution a rencontré un problème" : "Demande traitée"}</h2></div><button className="icon-button" onClick={() => setRunStatus("idle")} aria-label="Fermer la trace"><Icon name="x" size={18} /></button></div>{runStatus === "running" ? <div className="run-loading"><span className="loading-pulse" /> Analyse du contexte, recherche des outils disponibles…</div> : <><div className="run-timeline">{runEvents.map((item) => <div key={item.id} className="run-event"><span className={`run-event-line event-${item.type}`}><Icon name={item.type === "tool_called" ? "zap" : item.type === "handoff_started" ? "arrowRight" : item.type === "agent_completed" ? "check" : "sparkles"} size={13} /></span><div><strong>{formatAgent(item.agentId)}</strong><p>{item.summary.replace(formatAgent(item.agentId), "").trim()}</p></div></div>)}</div>{runAnswer ? <div className="run-answer"><span className="answer-check"><Icon name="check" size={15} /></span><p>{runAnswer}</p></div> : null}{pendingAction ? <PendingActionCard action={pendingAction} onResolved={() => undefined} /> : null}</>}</section> : null}

    <SectionHeading icon="target" title="Aujourd’hui" action="Voir tout" />
    <section className="today-grid"><EmptyState icon="target" title="Aucune priorité pour le moment" text="Les tâches et échéances que vous créerez apparaîtront ici." /></section>

    <SectionHeading icon="bot" title="Mes agents" action="Voir tous les agents" />
    <section className="agents-grid">{agents.map((agent) => <article key={agent.id} className="agent-card"><AgentAvatar agentId={agent.id} size="md" /><div className="agent-card-name">{agent.handle} <span className="online-dot" /></div><div className="agent-card-role">{agent.role}</div><p>{agent.description}</p></article>)}</section>

    <div className="dashboard-bottom-grid"><section className="panel projects-panel"><SectionHeading icon="folder" title="Projets récents" action="Voir tous" /><EmptyState icon="folder" title="Aucun projet" text="Créez votre premier projet pour commencer à organiser votre travail." /></section><section className="panel tasks-panel"><SectionHeading icon="checkCircle" title="Tâches du jour" action="Voir toutes" /><EmptyState icon="checkCircle" title="Aucune tâche" text="Les tâches créées depuis le dashboard apparaîtront ici." /></section></div>
  </>;
}
