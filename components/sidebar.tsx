"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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

const spaces = ["Personnel"];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {open ? <button className="mobile-backdrop" aria-label="Fermer le menu" onClick={onClose} /> : null}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="brand-block">
          <div className="brand-mark brand-logo-mark">
            <Image className="brand-logo-image" src="/branding/agents-logo.png" alt="" aria-hidden="true" width={74} height={74} />
          </div>
          <div><div className="brand-name">Agents</div><div className="brand-subtitle">Votre espace de travail augmenté</div></div>
        </div>

        <nav className="main-nav" aria-label="Navigation principale">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`} onClick={onClose}><Icon name={item.icon} size={18} /><span>{item.label}</span></Link>;
          })}
        </nav>

        <div className="sidebar-divider" />
        <div className="spaces-heading"><span>Espaces</span></div>
        <div className="space-list">
          {spaces.map((space, index) => <div key={space} className="space-item active"><span className={`space-dot space-dot-${index}`} /><span>{space}</span></div>)}
        </div>

      </aside>
    </>
  );
}
