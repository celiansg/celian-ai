import type { Metadata } from "next";
import { BatWorkspace } from "@/components/bat-workspace";
import { PreflightPanel } from "@/components/preflight-panel";
import { BleedPanel } from "@/components/bleed-panel";
import { getBatTemplateStatus } from "@/lib/bat/template";
import mapping from "@/knowledge/templates/BAT-template.mapping.v1.json";

export const metadata: Metadata = { title: "Nouveau BAT | Agents" };
export const dynamic = "force-dynamic";

export default async function BatPage({ searchParams }: { searchParams: Promise<{ project?: string | string[] }> }) {
  const { project } = await searchParams;
  const initialProjectId = typeof project === "string" && project.length <= 128 ? project : undefined;
  return <div className="standalone-page"><PreflightPanel /><BleedPanel /><BatWorkspace available={getBatTemplateStatus().available} version={mapping.version} initialProjectId={initialProjectId} /></div>;
}
