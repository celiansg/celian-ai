"use client";

import { AlertTriangle, CheckCircle2, Download, Scissors } from "lucide-react";
import { useEffect, useState } from "react";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { addCutlineToPdf, type CutlineMode, type CutlineResult } from "@/lib/bat/cutline";

function numberValue(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function CutlinePanel({ file }: { file?: File }) {
  const [mode, setMode] = useState<CutlineMode>("trim");
  const [width, setWidth] = useState("100");
  const [height, setHeight] = useState("100");
  const [spotName, setSpotName] = useState("CutContour");
  const [lineWidth, setLineWidth] = useState("0.25");
  const [pages, setPages] = useState<"all" | "one">("all");
  const [page, setPage] = useState("1");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<CutlineResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setResult(null);
    setFileName(file?.name ?? "");
  }, [file]);

  async function createCutline(file: File) {
    setBusy(true);
    setError("");
    setResult(null);
    setFileName(file.name);
    try {
      const nextResult = await addCutlineToPdf(new Uint8Array(await file.arrayBuffer()), {
        mode,
        widthMm: numberValue(width),
        heightMm: numberValue(height),
        spotName,
        lineWidthPt: numberValue(lineWidth) ?? 0,
        pages: pages === "all" ? "all" : numberValue(page) ?? 0,
      });
      setResult(nextResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de créer le tracé de découpe.");
    } finally {
      setBusy(false);
    }
  }

  function downloadResult() {
    if (!result) return;
    const baseName = fileName.replace(/\.pdf$/i, "") || "document";
    const binary = new ArrayBuffer(result.bytes.byteLength);
    new Uint8Array(binary).set(result.bytes);
    const url = URL.createObjectURL(new Blob([binary], { type: "application/pdf" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${baseName}-trace-decoupe.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <section id="bat-cutline" className="cutline-panel" aria-labelledby="cutline-title">
    <div className="cutline-head">
      <div>
        <div className="eyebrow">Étape 3 · prépresse</div>
        <h2 id="cutline-title"><Scissors size={18} aria-hidden="true" /> Ajouter un tracé de découpe</h2>
        <p>Crée un rectangle vectoriel en ton direct, centré sur la zone de rognage ou sur des dimensions personnalisées.</p>
      </div>
      <Scissors size={22} aria-hidden="true" />
    </div>
    <div className="cutline-warning" role="note">
      <AlertTriangle size={15} aria-hidden="true" />
      <span>Le PDF produit contient une vraie séparation <strong>Separation</strong> avec surimpression. Le nom du ton direct doit correspondre à celui attendu par votre RIP.</span>
    </div>
    <div className="cutline-controls">
      <label>Position du tracé
        <select value={mode} onChange={(event) => setMode(event.target.value as CutlineMode)}>
          <option value="trim">Zone de rognage</option>
          <option value="custom">Dimensions personnalisées, centrées</option>
        </select>
      </label>
      {mode === "custom" && <>
        <label>Largeur (mm)
          <input inputMode="decimal" type="number" min="0.1" step="0.1" value={width} onChange={(event) => setWidth(event.target.value)} />
        </label>
        <label>Hauteur (mm)
          <input inputMode="decimal" type="number" min="0.1" step="0.1" value={height} onChange={(event) => setHeight(event.target.value)} />
        </label>
      </>}
      <label>Nom du ton direct
        <input value={spotName} onChange={(event) => setSpotName(event.target.value)} maxLength={64} placeholder="CutContour" />
      </label>
      <label>Épaisseur (pt)
        <input inputMode="decimal" type="number" min="0.01" max="20" step="0.01" value={lineWidth} onChange={(event) => setLineWidth(event.target.value)} />
      </label>
      <label>Pages
        <select value={pages} onChange={(event) => setPages(event.target.value as "all" | "one")}>
          <option value="all">Toutes les pages</option>
          <option value="one">Une seule page</option>
        </select>
      </label>
      {pages === "one" && <label>Numéro de page
        <input inputMode="numeric" type="number" min="1" step="1" value={page} onChange={(event) => setPage(event.target.value)} />
      </label>}
      <div className="cutline-file">
        {file
          ? <button type="button" className="primary-button" disabled={busy} onClick={() => void createCutline(file)}>{busy ? "Création du tracé…" : "Créer le tracé"}</button>
          : <PdfDropzone label={busy ? "Création du tracé…" : "Choisir le PDF à préparer"} hint="PDF · 25 Mo maximum · le contenu reste vectoriel" disabled={busy} onFile={createCutline} />}
      </div>
    </div>
    {error && <p className="cutline-feedback error" role="alert">{error}</p>}
    {result && <div className="cutline-result" role="status">
      <div><strong><CheckCircle2 size={15} aria-hidden="true" /> Tracé créé</strong><span>{result.placements.length} page{result.placements.length > 1 ? "s" : ""} · ton direct {result.spotName}</span><small>{result.warning}</small></div>
      <button type="button" className="secondary-action" onClick={downloadResult}><Download size={14} aria-hidden="true" /> Télécharger le PDF</button>
    </div>}
  </section>;
}
