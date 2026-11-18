"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";

const shortcuts = [
  { label: "Résume ma journée", icon: "sparkles", prompt: "Résume ma journée et prépare mes priorités." },
];

export function CommandBar({ onRun }: { onRun: (prompt: string) => Promise<void> }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim() || loading) return;
    setLoading(true);
    await onRun(value.trim());
    setValue("");
    setLoading(false);
  }
  async function runShortcut(prompt: string) {
    setLoading(true);
    await onRun(prompt);
    setLoading(false);
  }
  return <div className="command-wrap"><form className="command-bar" onSubmit={submit}><span className="command-spark"><Icon name="sparkles" size={18} /></span><input name="dashboard-request" autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Demande à @Célian…" aria-label="Demande à Célian" /><button type="submit" className="send-button" aria-label={loading ? "Demande en cours" : "Envoyer"} aria-busy={loading} disabled={loading}><Icon name="send" size={18} /></button></form><div className="shortcut-row"><Link className="shortcut-chip" href="/bat"><Icon name="pen" size={14} />Analyser un BAT</Link><Link className="shortcut-chip" href="/tasks"><Icon name="plus" size={14} />Créer une tâche</Link>{shortcuts.map((shortcut) => <button type="button" key={shortcut.label} className="shortcut-chip" onClick={() => runShortcut(shortcut.prompt)} disabled={loading}><Icon name={shortcut.icon} size={14} />{shortcut.label}</button>)}</div></div>;
}
