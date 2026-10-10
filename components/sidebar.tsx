"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icon";

const navItems = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/agents", label: "Agents", icon: "bot" },
  { href: "/projects", label: "Projets", icon: "folderKanban" },
  { href: "/tasks", label: "Tâches", icon: "checkCircle" },
  { href: "/calendar", label: "Calendrier", icon: "calendar" },
  { href: "/files", label: "Fichiers", icon: "folder" },
  { href: "/settings", label: "Paramètres", icon: "settings" },
];

const spaces = ["Personnel", "Nivo", "Maison des Menhirs", "AFLPH", "Portfolio"];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [activeSpace, setActiveSpace] = useState("Personnel");
  return (
    <>
      {open ? <button className="mobile-backdrop" aria-label="Fermer le menu" onClick={onClose} /> : null}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="brand-block">
          <div className="brand-mark"><Icon name="sparkles" size={21} strokeWidth={2.3} /></div>
          <div><div className="brand-name">Célian AI</div><div className="brand-subtitle">Votre espace de travail augmenté</div></div>
        </div>

        <nav className="main-nav" aria-label="Navigation principale">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`} onClick={onClose}><Icon name={item.icon} size={18} /><span>{item.label}</span></Link>;
          })}
        </nav>

        <div className="sidebar-divider" />
        <div className="spaces-heading"><span>Espaces</span><button className="icon-button muted" aria-label="Ajouter un espace"><Icon name="plus" size={16} /></button></div>
        <div className="space-list">
          {spaces.map((space, index) => <button key={space} className={`space-item ${activeSpace === space ? "active" : ""}`} onClick={() => setActiveSpace(space)}><span className={`space-dot space-dot-${index}`} /><span>{space}</span></button>)}
          <button className="space-item new-space"><span className="space-add"><Icon name="plus" size={14} /></span><span>Nouveau projet</span></button>
        </div>

        <div className="sidebar-promo"><span className="promo-spark"><Icon name="sparkles" size={16} /></span><div className="promo-title">Passez plus loin avec Célian AI Pro</div><p>Agents avancés, plus de capacité, outils premium…</p><button>Découvrir Pro <Icon name="arrowRight" size={15} /></button></div>
      </aside>
    </>
  );
}
