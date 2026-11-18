"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSearch, Info, XCircle } from "lucide-react";
import { preflightPdf, preflightProfiles, preflightStatusLabel, type PreflightProfile, type PreflightReport } from "@/lib/bat/preflight";
import { formatFileSize } from "@/lib/local-files/indexed-db";

function issueIcon(severity: string) {
  if (severity === "error") return <XCircle size={15} aria-hidden="true" />;
  if (severity === "warning") return <AlertTriangle size={15} aria-hidden="true" />;
  if (severity === "unsupported") return <Info size={15} aria-hidden="true" />;
  return <CheckCircle2 size={15} aria-hidden="true" />;
}

function statusClass(status: PreflightReport["status"]) {
  return status === "pass" ? "preflight-status pass" : status === "warning" ? "preflight-status warning" : "preflight-status fail";
}

export function PreflightPanel() {
  const [profileId, setProfileId] = useState("generic");
  const [report, setReport] = useState<PreflightReport | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function analyze(file: File) {
    setBusy(true);
    setError("");
    setFileName(file.name);
    try {
      const profile: PreflightProfile = preflightProfiles[profileId] ?? preflightProfiles.generic;
      setReport(await preflightPdf(new Uint8Array(await file.arrayBuffer()), profile));
    } catch {
      setReport(null);
      setError("Ce PDF n’a pas pu être analysé. Vérifiez le format, la taille et la protection du fichier.");
    } finally {
      setBusy(false);
    }
  }

  function downloadReport() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ fileName, report }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName.replace(/\.pdf$/i, "") || "rapport-preflight"}.preflight.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="preflight-panel" aria-labelledby="preflight-title">
      <div className="preflight-head">
        <div><div className="eyebrow">Contrôle de production</div><h2 id="preflight-title">Préflight PDF</h2><p>Mesure les pages, boxes, rotations, annotations et fonds perdus sans modifier le fichier original.</p></div>
        <FileSearch size={22} aria-hidden="true" />
      </div>
      <div className="preflight-controls">
        <label>Profil<select value={profileId} onChange={(event) => setProfileId(event.target.value)} disabled={busy}><option value="generic">{preflightProfiles.generic.label}</option><option value="a4Landscape">{preflightProfiles.a4Landscape.label}</option><option value="a4Portrait">{preflightProfiles.a4Portrait.label}</option></select></label>
        <label className="preflight-file">PDF à contrôler<input type="file" accept=".pdf,application/pdf" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void analyze(file); }} /></label>
      </div>
      {busy && <p className="preflight-feedback" role="status">Analyse sécurisée du PDF en cours…</p>}
      {error && <p className="preflight-feedback error" role="alert">{error}</p>}
      {report && (
        <div className="preflight-result" aria-live="polite">
          <div className={statusClass(report.status)}><span>{report.status === "pass" ? "✓" : report.status === "warning" ? "!" : "×"}</span><div><strong>{preflightStatusLabel(report.status)}</strong><small>{fileName} · {formatFileSize(report.file.bytes)} · {report.file.pages} page(s)</small></div></div>
          <div className="preflight-counters"><span className="info">{report.summary.info} infos</span><span className="warning">{report.summary.warning} avertissements</span><span className="error">{report.summary.error} erreurs</span><span className="unsupported">{report.summary.unsupported} limites</span></div>
          <div className="preflight-actions"><button type="button" className="secondary-button" onClick={downloadReport}><Download size={15} aria-hidden="true" /> Télécharger le rapport JSON</button></div>
          <div className="preflight-pages"><strong>Mesures par page</strong>{report.pages.map((page) => <div className="preflight-page-row" key={page.page}><span>Page {page.page}</span><span>Trim {Math.round(page.trimBox.width / (72 / 25.4))}×{Math.round(page.trimBox.height / (72 / 25.4))} mm</span><span>Rotation {page.rotation}°</span><span>{page.explicitBoxes.bleed ? "BleedBox présente" : "BleedBox absente"}</span></div>)}</div>
          <ul className="preflight-issues">{report.issues.map((issue, index) => <li className={`preflight-issue ${issue.severity}`} key={`${issue.code}-${issue.page ?? "doc"}-${index}`}>{issueIcon(issue.severity)}<div><strong>{issue.page ? `Page ${issue.page} · ` : ""}{issue.message}</strong><small>{issue.code} · {issue.proof}</small></div></li>)}</ul>
        </div>
      )}
    </section>
  );
}
