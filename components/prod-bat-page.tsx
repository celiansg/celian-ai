"use client";

import { useState } from "react";
import { BatWorkspace } from "@/components/bat-workspace";
import { ProdPdfWorkspace } from "@/components/prod-pdf-workspace";

export function ProdBatPage({ available, version, initialProjectId }: { available: boolean; version: string; initialProjectId?: string }) {
  const [file, setFile] = useState<File>();
  return <div className="bat-tools"><ProdPdfWorkspace file={file} onFileChange={setFile} /><BatWorkspace available={available} version={version} initialProjectId={initialProjectId} initialSourceFile={file} /></div>;
}
