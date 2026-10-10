"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { DashboardView } from "./dashboard-view";
import { RightRail } from "./right-rail";

export function WorkspaceShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return <div className="app-shell"><Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /><div className="workspace"><Topbar onMenu={() => setSidebarOpen(true)} /><div className="workspace-grid"><main className="main-content"><DashboardView /></main><RightRail /></div></div></div>;
}
