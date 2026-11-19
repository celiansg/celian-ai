"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSearch, Info, XCircle } from "lucide-react";
import { preflightPdf, preflightProfiles, preflightStatusLabel, type PreflightProfile, type PreflightReport } from "@/lib/bat/preflight";
import { generatePreflightReportPdf } from "@/lib/bat/report";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { formatFileSize } from "@/lib/local-files/indexed-db";
import { listLocalPreflightReports, saveLocalPreflightReport } from "@/lib/local-workspace/indexed-db";
import type { LocalPreflightReport } from "@/lib/local-workspace/types";

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
  const [customTrimWidth, setCustomTrimWidth] = useState("210");
  const [customTrimHeight, setCustomTrimHeight] = useState("297");
  const [customBleed, setCustomBleed] = useState("3");
  const [report, setReport] = useState<PreflightReport | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issueFilter, setIssueFilter] = useState<"all" | "error" | "warning" | "unsupported">("all");
  const [savedReports, setSavedReports] = useState<LocalPreflightReport[]>([]);
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    setReport(null);
    setFileName(file?.name ?? "");
    setError("");
    setSaveStatus("");
  }, [file]);

  useEffect(() => {
    let active = true;
    void listLocalPreflightReports().then((reports) => { if (active) setSavedReports(reports); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  function getSelectedProfile(): PreflightProfile | null {
    if (profileId !== "custom") return preflightProfiles[profileId] ?? preflightProfiles.generic;
    const widthMm = Number(customTrimWidth);
    const heightMm = Number(customTrimHeight);
    const bleedMm = Number(customBleed);
    if (![widthMm, heightMm, bleedMm].every(Number.isFinite) || widthMm <= 0 || heightMm <= 0 || bleedMm < 0 || bleedMm > 100) return null;
    return {
      id: "custom",
      label: `Format personnalisé ${widthMm} × ${heightMm} mm · fond perdu ${bleedMm} mm`,
      expectedTrim: { widthMm, heightMm, toleranceMm: 0.5 },
      requiredBleedMm: bleedMm,
    };
  }

  async function analyze(fileToAnalyze: File) {
    setBusy(true);
    setError("");
    setFileName(fileToAnalyze.name);
    try {
      const profile = getSelectedProfile();
      if (!profile) throw new Error("Renseignez un format fini et un fond perdu valides.");
      setReport(await preflightPdf(new Uint8Array(await fileToAnalyze.arrayBuffer()), profile));
    } catch (caught) {
      setReport(null);
      setError(caught instanceof Error ? caught.message : "Ce PDF n’a pas pu être analysé. Vérifiez le format et la protection du fichier.");
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

  async function saveReport() {
    if (!report) return;
    try {
      setSaveStatus("Enregistrement…");
      const fileSha256 = file ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())), (byte) => byte.toString(16).padStart(2, "0")).join("") : undefined;
      const saved = await saveLocalPreflightReport({ fileName: fileName || "rapport-sans-fichier.pdf", fileSha256, profileId: report.profile.id, status: report.status, report });
      setSavedReports((current) => [saved, ...current]);
      setSaveStatus("Rapport enregistré sur cet appareil.");
    } catch {
      setSaveStatus("Impossible d’enregistrer le rapport localement.");
    }
  }

  function openSavedReport(saved: LocalPreflightReport) {
    setReport(saved.report);
    setFileName(saved.fileName);
    setProfileId(saved.profileId);
    if (saved.report.profile.expectedTrim) {
      setCustomTrimWidth(String(saved.report.profile.expectedTrim.widthMm));
      setCustomTrimHeight(String(saved.report.profile.expectedTrim.heightMm));
      setCustomBleed(String(saved.report.profile.requiredBleedMm));
    }
    setIssueFilter("all");
    setSaveStatus("Rapport archivé rouvert. Il correspond à une mesure passée du fichier.");
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
        <label>Profil<select value={profileId} onChange={(event) => { setProfileId(event.target.value); setReport(null); setIssueFilter("all"); }} disabled={busy}><option value="generic">{preflightProfiles.generic.label}</option><option value="a4Landscape">{preflightProfiles.a4Landscape.label}</option><option value="a4Portrait">{preflightProfiles.a4Portrait.label}</option><option value="digitalPrint">{preflightProfiles.digitalPrint.label}</option><option value="custom">Format fini personnalisé</option></select></label>
        {profileId === "custom" && <div className="preflight-custom-profile"><label>Largeur finie (mm)<input type="number" min="1" step="0.1" value={customTrimWidth} onChange={(event) => setCustomTrimWidth(event.target.value)} disabled={busy} /></label><label>Hauteur finie (mm)<input type="number" min="1" step="0.1" value={customTrimHeight} onChange={(event) => setCustomTrimHeight(event.target.value)} disabled={busy} /></label><label>Fond perdu (mm)<input type="number" min="0" max="100" step="0.1" value={customBleed} onChange={(event) => setCustomBleed(event.target.value)} disabled={busy} /></label></div>}
        <div className="preflight-file">{file
          ? <button type="button" className="primary-button" disabled={busy} onClick={() => void analyze(file)}>{busy ? "Analyse en cours…" : "Analyser ce PDF"}</button>
          : <PdfDropzone label="Choisir le PDF à contrôler" hint="Le fichier original ne sera pas modifié · toutes les pages sont analysées" disabled={busy} onFile={(nextFile) => void analyze(nextFile)} />}</div>
      </div>
      {busy && <p className="preflight-feedback" role="status">Analyse sécurisée du PDF en cours…</p>}
      {error && <p className="preflight-feedback error" role="alert">{error}</p>}
      {report && (
        <div className="preflight-result" aria-live="polite">
          <div className={statusClass(report.status)}><span>{report.status === "pass" ? "✓" : report.status === "warning" ? "!" : "×"}</span><div><strong>{preflightStatusLabel(report.status)}</strong><small>{fileName} · {formatFileSize(report.file.bytes)} · {report.file.pages} page(s)</small></div></div>
          <div className="preflight-counters"><span className="info">{report.summary.info} infos</span><span className="warning">{report.summary.warning} avertissements</span><span className="error">{report.summary.error} erreurs</span><span className="unsupported">{report.summary.unsupported} limites</span></div>
          <div className="preflight-counters"><span className="info">{report.pages.reduce((total, page) => total + page.resources.images, 0)} images</span><span className="info">{report.pages.reduce((total, page) => total + page.resources.embeddedFonts, 0)} polices incorporées</span><span className="warning">{report.pages.reduce((total, page) => total + page.resources.unembeddedFonts, 0)} polices non incorporées</span></div>
          <div className="preflight-actions"><button type="button" className="secondary-button" onClick={downloadReport}><Download size={15} aria-hidden="true" /> Rapport JSON</button><button type="button" className="primary-button" onClick={() => void downloadPdfReport()}><Download size={15} aria-hidden="true" /> Rapport PDF</button><button type="button" className="secondary-button" onClick={() => void saveReport()}>Archiver le rapport</button><label className="preflight-filter">Afficher <select value={issueFilter} onChange={(event) => setIssueFilter(event.target.value as typeof issueFilter)}><option value="all">tous les contrôles</option><option value="error">erreurs uniquement</option><option value="warning">avertissements</option><option value="unsupported">limites du moteur</option></select></label></div>
          {saveStatus && <p className="preflight-feedback" role="status">{saveStatus}</p>}
          <div className="preflight-pages"><strong>Mesures par page</strong>{report.pages.map((page) => <div className="preflight-page-row" key={page.page}><span>Page {page.page}</span><span>Trim {Math.round(page.trimBox.width / (72 / 25.4))}×{Math.round(page.trimBox.height / (72 / 25.4))} mm</span><span>Rotation {page.rotation}°</span><span>{page.explicitBoxes.bleed ? "BleedBox présente" : "BleedBox absente"}</span><span>{page.resources.images} image(s){page.resources.colorSpaces.length > 0 ? ` · ${page.resources.colorSpaces.join(", ")}` : ""} · surimpression ${page.resources.overprintStates} · transparence ${page.resources.transparencyStates}</span></div>)}</div>
          <ul className="preflight-issues">{report.issues.filter((issue) => issueFilter === "all" || issue.severity === issueFilter).map((issue, index) => <li className={`preflight-issue ${issue.severity}`} key={`${issue.code}-${issue.page ?? "doc"}-${index}`}>{issueIcon(issue.severity)}<div><strong>{issue.page ? `Page ${issue.page} · ` : ""}{issue.message}</strong><small>{issue.code} · {issue.proof}</small><em>Méthode : {issue.method}</em></div></li>)}</ul>
          {report.issues.filter((issue) => issueFilter === "all" || issue.severity === issueFilter).length === 0 && <p className="preflight-feedback">Aucun contrôle ne correspond à ce filtre.</p>}
          {savedReports.length > 0 && <details className="preflight-history"><summary>Rapports archivés sur cet appareil ({savedReports.length})</summary><div className="preflight-history-list">{savedReports.slice(0, 8).map((saved) => <button type="button" key={saved.id} onClick={() => openSavedReport(saved)}><strong>{saved.fileName}</strong><span>{new Date(saved.createdAt).toLocaleString("fr-FR")} · {saved.status === "fail" ? "non conforme" : saved.status === "warning" ? "à vérifier" : "contrôlé"}</span></button>)}</div></details>}
        </div>
      )}
    </section>
  );
}
