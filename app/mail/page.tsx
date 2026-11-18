import type { Metadata } from "next";
import { MailWorkspace } from "@/components/mail-workspace";

export const metadata: Metadata = { title: "Brouillon client | Agents" };

export default async function MailPage({ searchParams }: { searchParams: Promise<{ bat?: string | string[]; version?: string | string[] }> }) {
  const { bat, version } = await searchParams;
  const batId = typeof bat === "string" && /^[0-9a-f-]{36}$/i.test(bat) ? bat : undefined;
  const versionId = typeof version === "string" && /^mail-[a-z0-9-]{5,60}$/i.test(version) ? version : undefined;
  return <MailWorkspace key={versionId ?? batId ?? "manual"} batId={batId} versionId={versionId} />;
}
