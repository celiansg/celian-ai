"use client";

import { useState } from "react";
import { Icon } from "./icon";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  return <header className="topbar"><button className="mobile-menu icon-button" aria-label="Ouvrir le menu" onClick={onMenu}><Icon name="menu" size={20} /></button><div className="topbar-spacer" />{searchOpen ? <div className="top-search"><Icon name="search" size={16} /><input autoFocus placeholder="Rechercher dans votre espace" onBlur={() => setSearchOpen(false)} /></div> : <button className="icon-button topbar-icon" aria-label="Rechercher" onClick={() => setSearchOpen(true)}><Icon name="search" size={19} /></button>}<button className="icon-button topbar-icon notification" aria-label="Notifications"><Icon name="bell" size={19} /><span /></button><div className="profile"><span className="profile-photo">CS</span><span className="profile-name">Célian</span><Icon name="chevronDown" size={15} /></div></header>;
}
