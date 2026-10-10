"use client";

import { useState } from "react";
import { Icon } from "./icon";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  return <header className="topbar"><button type="button" className="mobile-menu icon-button" aria-label="Ouvrir le menu" onClick={onMenu}><Icon name="menu" size={20} /></button><div className="topbar-spacer" />{searchOpen ? <div className="top-search"><Icon name="search" size={16} /><input type="search" name="workspace-search" aria-label="Rechercher dans votre espace" autoComplete="off" placeholder="Rechercher dans votre espace…" onBlur={() => setSearchOpen(false)} /></div> : <button type="button" className="icon-button topbar-icon" aria-label="Rechercher" onClick={() => setSearchOpen(true)}><Icon name="search" size={19} /></button>}<div className="profile"><span className="profile-photo" role="img" aria-label="Profil de Célian">CS</span><span className="profile-name">Célian</span><Icon name="chevronDown" size={15} /></div></header>;
}
