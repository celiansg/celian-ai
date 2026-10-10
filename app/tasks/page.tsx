"use client";

import { useState } from "react";
import { tasks } from "@/lib/mock-data";
import { getAgent } from "@/lib/ai/agents";
import { AgentAvatar } from "@/components/agent-avatar";
import { Icon } from "@/components/icon";

export default function TasksPage() {
  const [done, setDone] = useState(tasks.filter((task) => task.done).map((task) => task.id));
  return <div className="standalone-page"><div className="standalone-head"><div><div className="eyebrow">Workspace / Tâches</div><h1>Les tâches qui font avancer les projets</h1><p>Une vue simple sur ce qui est à faire maintenant, bientôt ou déjà terminé.</p></div><button className="primary-button"><Icon name="plus" size={16} />Nouvelle tâche</button></div><div className="task-view-tabs"><button className="active">Aujourd’hui <span>4</span></button><button>À venir <span>8</span></button><button>Terminées <span>12</span></button></div><section className="full-task-list">{tasks.map((task) => { const isDone = done.includes(task.id); const agent = getAgent(task.agent); return <div className={`full-task-row ${isDone ? "done" : ""}`} key={task.id}><button className={`task-checkbox ${isDone ? "checked" : ""}`} onClick={() => setDone((current) => current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id])} aria-label="Changer le statut">{isDone ? <Icon name="check" size={12} /> : null}</button><div className="full-task-title"><strong>{task.title}</strong><span>{task.project}</span></div><time>{task.time}</time><span className="priority-text">{task.priority}</span><div className="task-assignee"><AgentAvatar agentId={task.agent} size="sm" /><span style={{ color: agent.color }}>{agent.handle}</span></div><button className="icon-button"><Icon name="more" size={17} /></button></div>})}</section></div>;
}
