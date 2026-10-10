"use client";

import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { RightRail } from "./right-rail";

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;
  const isDashboard = pathname === "/";
  return <div className="app-shell"><Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /><div className="workspace"><Topbar onMenu={() => setSidebarOpen(true)} /><div className={`workspace-grid ${isDashboard ? "" : "route-grid"}`}><main className={`main-content ${isDashboard ? "" : "route-main"}`}>{children}</main>{isDashboard ? <RightRail /> : null}</div></div></div>;
}
