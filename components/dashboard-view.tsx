"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { agents } from "@/lib/ai/agents";
import type { AgentRunEvent, AgentId, PendingAction } from "@/lib/ai/types";
import { AgentAvatar } from "./agent-avatar";
import { CommandBar } from "./command-bar";
import { Icon } from "./icon";
import { EmptyState, SectionHeading } from "./ui";
import { PendingActionCard } from "./pending-action-card";
import { GradientText } from "./ui/gradient-text";
import { LiquidMetalButton } from "./ui/liquid-metal-button";

function formatAgent(agentId: AgentId) {
  return agents.find((agent) => agent.id === agentId)?.handle ?? "@Célian";
}

export function DashboardView() {
  const router = useRouter();
  const [runEvents, setRunEvents] = useState<AgentRunEvent[]>([]);
  const [runAnswer, setRunAnswer] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | undefined>();
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [lastGoal, setLastGoal] = useState("");

  async function runGoal(prompt: string) {
    setLastGoal(prompt);
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
      setRunAnswer("La demande n’a pas pu aboutir. Vérifiez la configuration du provider puis réessayez.");
      setRunStatus("error");
    }
  }

  const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(new Date());

  return <>
    <section className="welcome-section"><div><div className="eyebrow">{today.charAt(0).toUpperCase() + today.slice(1)}</div><h1>Bonjour <GradientText as="span">Célian</GradientText> <span className="sun-mark">✦</span></h1><p className="welcome-summary">0 tâche aujourd’hui <span>·</span> 0 action en attente <span>·</span> Votre espace est prêt.</p></div></section>
    <CommandBar onRun={runGoal} />

    {runStatus !== "idle" ? <section className={`run-panel ${runStatus}`} role="status" aria-live="polite"><div className="run-panel-head"><div><div className="eyebrow">Exécution en direct</div><h2>{runStatus === "running" ? "Célian organise votre demande" : runStatus === "error" ? "L’exécution a rencontré un problème" : "Demande traitée"}</h2></div><button type="button" className="icon-button" onClick={() => setRunStatus("idle")} aria-label="Fermer la trace"><Icon name="x" size={18} /></button></div>{runStatus === "running" ? <div className="run-loading"><span className="loading-pulse" aria-hidden="true" /> Analyse du contexte, recherche des outils disponibles…</div> : <>{runStatus === "error" ? <div className="run-answer run-error-message"><span className="answer-check"><Icon name="x" size={15} /></span><div><p>{runAnswer}</p>{lastGoal ? <button type="button" className="text-action" onClick={() => void runGoal(lastGoal)}>Réessayer <Icon name="arrowRight" size={15} /></button> : null}</div></div> : <><div className="run-timeline">{runEvents.map((item) => <div key={item.id} className="run-event"><span className={`run-event-line event-${item.type}`}><Icon name={item.type === "tool_called" ? "zap" : item.type === "handoff_started" ? "arrowRight" : item.type === "agent_completed" ? "check" : "sparkles"} size={13} /></span><div><strong>{formatAgent(item.agentId)}</strong><p>{item.summary.replace(formatAgent(item.agentId), "").trim()}</p></div></div>)}</div>{runAnswer ? <div className="run-answer"><span className="answer-check"><Icon name="check" size={15} /></span><p>{runAnswer}</p></div> : null}{pendingAction ? <PendingActionCard action={pendingAction} onResolved={() => undefined} /> : null}</>}</>}</section> : null}

    <SectionHeading icon="target" title="Aujourd’hui" action="Voir les tâches" href="/tasks" />
    <section className="today-grid"><EmptyState icon="target" title="Aucune priorité pour le moment" text="Les tâches et échéances que vous créerez apparaîtront ici." action={<LiquidMetalButton label="Créer une tâche" onClick={() => router.push("/tasks")} />} /></section>

    <SectionHeading icon="bot" title="Mes agents" action="Voir tous les agents" href="/agents" />
    <section className="agents-grid">{agents.map((agent) => <article key={agent.id} className="agent-card"><AgentAvatar agentId={agent.id} size="md" /><div className="agent-card-name">{agent.handle} <span className="online-dot" /></div><div className="agent-card-role">{agent.role}</div><p>{agent.description}</p></article>)}</section>

    <div className="dashboard-bottom-grid"><section className="panel projects-panel"><SectionHeading icon="folder" title="Projets récents" action="Voir les projets" href="/projects" /><EmptyState icon="folder" title="Aucun projet" text="Créez votre premier projet pour commencer à organiser votre travail." action={<Link className="empty-state-action" href="/projects">Ouvrir les projets</Link>} /></section><section className="panel tasks-panel"><SectionHeading icon="checkCircle" title="Tâches du jour" action="Voir les tâches" href="/tasks" /><EmptyState icon="checkCircle" title="Aucune tâche" text="Les tâches créées depuis le dashboard apparaîtront ici." action={<Link className="empty-state-action" href="/tasks">Ouvrir les tâches</Link>} /></section></div>
  </>;
}
