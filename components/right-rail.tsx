"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icon";
import Link from "next/link";
import { listWorkspaceActivities, listWorkspaceTasks } from "@/lib/workspace/repository";
import type { LocalActivity, LocalTask } from "@/lib/local-workspace/types";

const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getCalendarDates() {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  return weekDays.map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { label: String(date.getDate()), selected: date.toDateString() === today.toDateString() };
  });
}

export function RightRail() {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [activities, setActivities] = useState<LocalActivity[]>([]);

  useEffect(() => {
    void Promise.all([listWorkspaceTasks(), listWorkspaceActivities()]).then(([nextTasks, nextActivities]) => {
      setTasks(nextTasks);
      setActivities(nextActivities);
    }).catch(() => undefined);
  }, []);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const todayTasks = tasks.filter((task) => task.status !== "completed" && (!task.dueAt || (new Date(task.dueAt) >= todayStart && new Date(task.dueAt) < tomorrowStart)));
  const dueCount = tasks.filter((task) => task.status !== "completed" && task.dueAt).length;
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(today);
  const dates = getCalendarDates();

  return <aside className="right-rail">
    <section className="rail-section overview-section">
      <div className="rail-heading"><div><span className="rail-heading-icon pink"><Icon name="barChart" size={17} /></span><h2>Vue d’ensemble</h2></div><span className="rail-select">Aujourd’hui</span></div>
      <div className="stats-grid">
        <div className="stat-card stat-blue"><Icon name="mail" size={19} /><strong>0</strong><span>mails à traiter</span></div>
        <div className="stat-card stat-pink"><Icon name="clock" size={19} /><strong>0</strong><span>actions en attente</span></div>
        <div className="stat-card stat-rose"><Icon name="calendar" size={19} /><strong>{dueCount}</strong><span>échéances</span></div>
        <div className="stat-card stat-green"><Icon name="checkCircle" size={19} /><strong>{todayTasks.length}</strong><span>tâches du jour</span></div>
      </div>
    </section>

    <section className="rail-section calendar-section">
      <div className="rail-heading"><div><span className="rail-heading-icon violet"><Icon name="calendar" size={17} /></span><h2>Mon calendrier</h2></div><Link className="text-action" href="/calendar">Ouvrir <Icon name="arrowRight" size={15} /></Link></div>
      <div className="calendar-month"><strong>{monthLabel}</strong></div>
      <div className="week-row">{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="date-row">{dates.map((date) => <span className={date.selected ? "selected" : ""} key={date.label}>{date.label}</span>)}</div>
      <div className="rail-empty">{todayTasks.length === 0 ? <><Icon name="calendar" size={18} /><span>Aucune tâche planifiée</span></> : <div className="rail-task-list">{todayTasks.slice(0, 4).map((task) => <div key={task.id}><span>{task.dueAt ? new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(new Date(task.dueAt)) : "—"}</span><strong>{task.title}</strong></div>)}</div>}</div>
    </section>

    <section className="rail-section activity-section">
      <div className="rail-heading"><div><span className="rail-heading-icon green"><Icon name="activity" size={17} /></span><h2>Activité récente</h2></div></div>
      <div className="rail-empty">{activities.length === 0 ? <><Icon name="activity" size={18} /><span>Aucune activité récente</span></> : <div className="rail-activity-list">{activities.slice(0, 4).map((activity) => <div key={activity.id}><strong>@{activity.agentId === "celian" ? "Célian" : activity.agentId}</strong><span>{activity.description}</span></div>)}</div>}</div>
    </section>
  </aside>;
}
