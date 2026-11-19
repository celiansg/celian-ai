"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSearch, Info, XCircle } from "lucide-react";
import { preflightPdf, preflightProfiles, preflightStatusLabel, type PreflightProfile, type PreflightReport } from "@/lib/bat/preflight";
import { generatePreflightReportPdf } from "@/lib/bat/report";
import { PdfDropzone } from "@/components/pdf-dropzone";
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

export function PreflightPanel({ file }: { file?: File }) {
  const [profileId, setProfileId] = useState("generic");
  const [report, setReport] = useState<PreflightReport | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReport(null);
    setFileName(file?.name ?? "");
    setError("");
  }, [file]);

  async function analyze(fileToAnalyze: File) {
    setBusy(true);
    setError("");
    setFileName(fileToAnalyze.name);
    try {
      const profile: PreflightProfile = preflightProfiles[profileId] ?? preflightProfiles.generic;
      setReport(await preflightPdf(new Uint8Array(await fileToAnalyze.arrayBuffer()), profile));
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

  async function downloadPdfReport() {
    if (!report) return;
    const bytes = await generatePreflightReportPdf(report, fileName);
    const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName.replace(/\.pdf$/i, "") || "rapport-preflight"}.preflight.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section id="bat-preflight" className="preflight-panel" aria-labelledby="preflight-title">
      <div className="preflight-head">
        <div><div className="eyebrow">Étape 1 · facultative</div><h2 id="preflight-title">Contrôler le PDF</h2><p>Mesure les pages, boxes, rotations, annotations et fonds perdus sans modifier le fichier original.</p></div>
        <FileSearch size={22} aria-hidden="true" />
      </div>
      <div className="preflight-controls">
        <label>Profil<select value={profileId} onChange={(event) => setProfileId(event.target.value)} disabled={busy}><option value="generic">{preflightProfiles.generic.label}</option><option value="a4Landscape">{preflightProfiles.a4Landscape.label}</option><option value="a4Portrait">{preflightProfiles.a4Portrait.label}</option><option value="digitalPrint">{preflightProfiles.digitalPrint.label}</option></select></label>
        <div className="preflight-file">{file
          ? <button type="button" className="primary-button" disabled={busy} onClick={() => void analyze(file)}>{busy ? "Analyse en cours…" : "Analyser ce PDF"}</button>
          : <PdfDropzone label="Choisir le PDF à contrôler" hint="25 Mo maximum · le fichier original ne sera pas modifié" disabled={busy} onFile={(nextFile) => void analyze(nextFile)} />}</div>
      </div>
      {busy && <p className="preflight-feedback" role="status">Analyse sécurisée du PDF en cours…</p>}
      {error && <p className="preflight-feedback error" role="alert">{error}</p>}
      {report && (
        <div className="preflight-result" aria-live="polite">
          <div className={statusClass(report.status)}><span>{report.status === "pass" ? "✓" : report.status === "warning" ? "!" : "×"}</span><div><strong>{preflightStatusLabel(report.status)}</strong><small>{fileName} · {formatFileSize(report.file.bytes)} · {report.file.pages} page(s)</small></div></div>
          <div className="preflight-counters"><span className="info">{report.summary.info} infos</span><span className="warning">{report.summary.warning} avertissements</span><span className="error">{report.summary.error} erreurs</span><span className="unsupported">{report.summary.unsupported} limites</span></div>
          <div className="preflight-counters"><span className="info">{report.pages.reduce((total, page) => total + page.resources.images, 0)} images</span><span className="info">{report.pages.reduce((total, page) => total + page.resources.embeddedFonts, 0)} polices incorporées</span><span className="warning">{report.pages.reduce((total, page) => total + page.resources.unembeddedFonts, 0)} polices non incorporées</span></div>
          <div className="preflight-actions"><button type="button" className="secondary-button" onClick={downloadReport}><Download size={15} aria-hidden="true" /> Rapport JSON</button><button type="button" className="primary-button" onClick={() => void downloadPdfReport()}><Download size={15} aria-hidden="true" /> Rapport PDF</button></div>
          <div className="preflight-pages"><strong>Mesures par page</strong>{report.pages.map((page) => <div className="preflight-page-row" key={page.page}><span>Page {page.page}</span><span>Trim {Math.round(page.trimBox.width / (72 / 25.4))}×{Math.round(page.trimBox.height / (72 / 25.4))} mm</span><span>Rotation {page.rotation}°</span><span>{page.explicitBoxes.bleed ? "BleedBox présente" : "BleedBox absente"}</span><span>{page.resources.images} image(s){page.resources.colorSpaces.length > 0 ? ` · ${page.resources.colorSpaces.join(", ")}` : ""} · surimpression ${page.resources.overprintStates} · transparence ${page.resources.transparencyStates}</span></div>)}</div>
          <ul className="preflight-issues">{report.issues.map((issue, index) => <li className={`preflight-issue ${issue.severity}`} key={`${issue.code}-${issue.page ?? "doc"}-${index}`}>{issueIcon(issue.severity)}<div><strong>{issue.page ? `Page ${issue.page} · ` : ""}{issue.message}</strong><small>{issue.code} · {issue.proof}</small></div></li>)}</ul>
        </div>
      )}
    </section>
  );
}
