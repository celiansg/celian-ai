"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import { Icon } from "@/components/icon";
import { listWorkspaceTasks } from "@/lib/workspace/repository";
import type { LocalTask } from "@/lib/local-workspace/types";

function sameDay(first: Date, second: Date) {
  return first.toDateString() === second.toDateString();
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => { const date = new Date(today); date.setDate(today.getDate() - today.getDay() + 1 + index); return date; }), [today]);
  const dayTasks = tasks.filter((task) => task.dueAt && sameDay(new Date(task.dueAt), selectedDate) && task.status !== "completed");
  const title = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(selectedDate);

  useEffect(() => { void listWorkspaceTasks().then(setTasks).catch(() => undefined).finally(() => setLoading(false)); }, []);

  return <div className="standalone-page"><div className="standalone-head"><div><div className="eyebrow">Workspace / Calendrier</div><h1>Votre journée, en un regard</h1><p>Le calendrier interne rassemble les échéances de vos tâches. Les rendez-vous externes seront ajoutés après connexion de Google Calendar.</p></div></div><div className="calendar-page-card"><div className="calendar-page-toolbar"><strong>{title.charAt(0).toUpperCase() + title.slice(1)}</strong><span>{tasks.filter((task) => task.dueAt && task.status !== "completed").length} échéance(s)</span></div><div className="calendar-week-strip">{dates.map((date) => <button type="button" key={date.toISOString()} className={sameDay(date, selectedDate) ? "active" : ""} onClick={() => setSelectedDate(date)}><span>{new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date)}</span><strong>{date.getDate()}</strong></button>)}</div>{loading ? <div className="workspace-loading">Chargement du calendrier…</div> : dayTasks.length === 0 ? <EmptyState icon="calendar" title="Aucune échéance ce jour" text="Ajoutez une date à une tâche pour la retrouver ici." /> : <div className="calendar-task-list">{dayTasks.map((task) => <article key={task.id}><span className="calendar-task-time">{task.dueAt ? new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(new Date(task.dueAt)) : "—"}</span><div><strong>{task.title}</strong><span>{task.priority === "high" ? "Priorité haute" : task.priority === "low" ? "Priorité basse" : "Priorité moyenne"}</span></div><Icon name="checkCircle" size={17} /></article>)}</div>}</div></div>;
}
