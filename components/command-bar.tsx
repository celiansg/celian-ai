"use client";

import { FormEvent, useState } from "react";
import { Icon } from "./icon";

const shortcuts = [
  { label: "Résume ma journée", icon: "sparkles", prompt: "Résume ma journée et prépare mes priorités." },
  { label: "Analyse mes mails", icon: "mail", prompt: "Analyse mes mails clients et prépare les réponses utiles." },
  { label: "Prépare un BAT", icon: "pen", prompt: "Prépare un BAT et signale les informations manquantes." },
  { label: "Crée une tâche", icon: "plus", prompt: "Crée une tâche pour finaliser le prochain livrable." },
  { label: "Planifie une réunion", icon: "calendar", prompt: "Planifie une réunion avec les prochaines échéances." },
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
  return <div className="command-wrap"><form className="command-bar" onSubmit={submit}><span className="command-spark"><Icon name="sparkles" size={18} /></span><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Demande à @Célian…" aria-label="Demande à Célian" /><button type="button" className="command-icon" aria-label="Joindre un fichier"><Icon name="paperclip" size={19} /></button><button type="button" className="command-icon" aria-label="Utiliser le micro"><Icon name="activity" size={18} /></button><button type="submit" className="send-button" aria-label="Envoyer" disabled={loading}><Icon name="send" size={18} /></button></form><div className="shortcut-row">{shortcuts.map((shortcut) => <button key={shortcut.label} className="shortcut-chip" onClick={() => runShortcut(shortcut.prompt)} disabled={loading}><Icon name={shortcut.icon} size={14} />{shortcut.label}</button>)}<button className="shortcut-chip more-chip" aria-label="Plus de raccourcis"><Icon name="more" size={17} /></button></div></div>;
}
