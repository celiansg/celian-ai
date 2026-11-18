"use client";

import { Icon } from "./icon";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  return <header className="topbar"><button type="button" className="mobile-menu icon-button" aria-label="Ouvrir le menu" onClick={onMenu}><Icon name="menu" size={20} /></button><div className="topbar-spacer" /><div className="profile"><span className="profile-photo" role="img" aria-label="Profil de Célian">CS</span><span className="profile-name">Célian</span></div></header>;
}
