"use client";

import { CheckCircle2, Crop, Download, Scissors } from "lucide-react";
import { useEffect, useState } from "react";
import { addCropMarksToPdf, trimPdfToFinished, type CropMarksResult } from "@/lib/bat/crop-marks";
import { PdfDropzone } from "@/components/pdf-dropzone";

type Operation = "add_marks" | "trim_to_finished";

function numberValue(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function CropMarksPanel({ file }: { file?: File }) {
  const [operation, setOperation] = useState<Operation>("add_marks");
  const [markLength, setMarkLength] = useState("10");
  const [offset, setOffset] = useState("3");
  const [lineWidth, setLineWidth] = useState("0.25");
  const [pages, setPages] = useState<"all" | "one">("all");
  const [page, setPage] = useState("1");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<CropMarksResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setResult(null);
    setFileName(file?.name ?? "");
  }, [file]);

  async function run(nextFile: File) {
    setBusy(true);
    setError("");
    setResult(null);
    setFileName(nextFile.name);
    try {
      const bytes = new Uint8Array(await nextFile.arrayBuffer());
      const selectedPages = pages === "all" ? "all" : numberValue(page) ?? 0;
      const nextResult = operation === "add_marks"
        ? await addCropMarksToPdf(bytes, { markLengthMm: numberValue(markLength) ?? 0, offsetMm: numberValue(offset) ?? 0, lineWidthPt: numberValue(lineWidth) ?? 0, pages: selectedPages })
        : await trimPdfToFinished(bytes, selectedPages);
      setResult(nextResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’opération sur le format fini a échoué.");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.bytes.buffer as ArrayBuffer], { type: "application/pdf" }));
    const suffix = result.operation === "add_marks" ? "traits-de-coupe" : "format-fini";
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName.replace(/\.pdf$/i, "") || "document"}-${suffix}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <section id="bat-crop-marks" className="cropmarks-panel" aria-labelledby="cropmarks-title">
    <div className="cropmarks-head"><div><div className="eyebrow">Étape 3 · format fini</div><h2 id="cropmarks-title"><Crop size={18} aria-hidden="true" /> Traits de coupe et rognage</h2><p>Ajoutez des repères autour de la TrimBox ou créez une copie rognée au format fini.</p></div><Scissors size={22} aria-hidden="true" /></div>
    <div className="cropmarks-warning" role="note">Le PDF original reste inchangé. Le rognage au format fini supprime les fonds perdus, repères et éléments situés hors de la TrimBox dans la nouvelle copie.</div>
    <div className="cropmarks-controls">
      <label>Opération<select value={operation} onChange={(event) => setOperation(event.target.value as Operation)} disabled={busy}><option value="add_marks">Ajouter les traits de coupe</option><option value="trim_to_finished">Rogner au format fini · supprimer les débords</option></select></label>
      {operation === "add_marks" && <>
        <label>Longueur des traits (mm)<input type="number" min="0.1" step="0.1" value={markLength} onChange={(event) => setMarkLength(event.target.value)} disabled={busy} /></label>
        <label>Décalage depuis le format fini (mm)<input type="number" min="0" step="0.1" value={offset} onChange={(event) => setOffset(event.target.value)} disabled={busy} /></label>
        <label>Épaisseur (pt)<input type="number" min="0.01" step="0.01" value={lineWidth} onChange={(event) => setLineWidth(event.target.value)} disabled={busy} /></label>
      </>}
      <label>Pages<select value={pages} onChange={(event) => setPages(event.target.value as "all" | "one")} disabled={busy}><option value="all">Toutes les pages</option><option value="one">Une seule page</option></select></label>
      {pages === "one" && <label>Numéro de page<input type="number" min="1" step="1" value={page} onChange={(event) => setPage(event.target.value)} disabled={busy} /></label>}
      <div className="cropmarks-file">{file
        ? <button type="button" className="primary-button" disabled={busy} onClick={() => void run(file)}>{busy ? "Préparation…" : operation === "add_marks" ? "Ajouter les traits" : "Rogner au format fini"}</button>
        : <PdfDropzone label={busy ? "Préparation…" : "Choisir le PDF"} hint="La sortie sera une nouvelle copie PDF" disabled={busy} onFile={(nextFile) => void run(nextFile)} />}</div>
    </div>
    {busy && <p className="cropmarks-feedback" role="status">Traitement du PDF en cours…</p>}
    {error && <p className="cropmarks-feedback error" role="alert">{error}</p>}
    {result && <div className="cropmarks-result" role="status"><div><strong><CheckCircle2 size={15} aria-hidden="true" /> {result.operation === "add_marks" ? "Traits ajoutés" : "PDF rogné"}</strong><span>{result.pageCount} page{result.pageCount > 1 ? "s" : ""} traitée{result.pageCount > 1 ? "s" : ""}</span><small>{result.warning}</small></div><button type="button" className="secondary-action" onClick={download}><Download size={14} aria-hidden="true" /> Télécharger le PDF</button></div>}
  </section>;
}
