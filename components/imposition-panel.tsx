"use client";

import { useEffect, useState } from "react";
import { Columns3, Download, Layers3 } from "lucide-react";
import { imposePdf, type ImpositionMode } from "@/lib/bat/imposition";
import { PdfDropzone } from "@/components/pdf-dropzone";

type Result = Awaited<ReturnType<typeof imposePdf>>;

export function ImpositionPanel({ file }: { file?: File }) {
  const [mode, setMode] = useState<ImpositionMode>("n_up");
  const [sheet, setSheet] = useState("a4");
  const [columns, setColumns] = useState("2");
  const [rows, setRows] = useState("2");
  const [gutter, setGutter] = useState("5");
  const [margin, setMargin] = useState("5");
  const [sourcePage, setSourcePage] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    setResult(null);
    setFileName(file?.name ?? "");
  }, [file]);

  async function create(file: File) {
    setBusy(true); setError(""); setFileName(file.name); setResult(null);
    try {
      const [sheetWidthMm, sheetHeightMm] = sheet === "a3" ? [297, 420] : [210, 297];
      setResult(await imposePdf(new Uint8Array(await file.arrayBuffer()), { sheetWidthMm, sheetHeightMm, columns: Number(columns), rows: Number(rows), gutterMm: Number(gutter), marginMm: Number(margin), mode, sourcePage: Number(sourcePage) }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’imposition n’a pas pu être créée.");
    } finally { setBusy(false); }
  }

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.bytes.buffer as ArrayBuffer], { type: "application/pdf" }));
    const link = document.createElement("a"); link.href = url; link.download = `${fileName.replace(/\.pdf$/i, "") || "imposition"}.impose.pdf`; link.click(); URL.revokeObjectURL(url);
  }

  return <section id="bat-imposition" className="imposition-panel" aria-labelledby="imposition-title">
    <div className="imposition-head"><div><div className="eyebrow">Étape 4 · facultative</div><h2 id="imposition-title">Mettre en page pour contrôle</h2><p>Place plusieurs pages sur une feuille en conservant le contenu vectoriel. Aucun repère machine n’est ajouté.</p></div><Layers3 size={22} aria-hidden="true" /></div>
    <div className="imposition-warning">Cette fonction prépare une épreuve ou une mise en page de contrôle. Vérifiez le format fini, le sens de lecture et les contraintes de votre flux de production.</div>
    <div className="imposition-controls">
      <label>Mode<select value={mode} onChange={(event) => setMode(event.target.value as ImpositionMode)} disabled={busy}><option value="n_up">N-up · pages successives</option><option value="step_repeat">Répétition · même page</option></select></label>
      <label>Feuille<select value={sheet} onChange={(event) => setSheet(event.target.value)} disabled={busy}><option value="a4">A4 · 210 × 297 mm</option><option value="a3">A3 · 297 × 420 mm</option></select></label>
      <label>Colonnes<select value={columns} onChange={(event) => setColumns(event.target.value)} disabled={busy}><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
      <label>Lignes<select value={rows} onChange={(event) => setRows(event.target.value)} disabled={busy}><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
      <label>Blanc entre poses (mm)<input type="number" min="0" max="100" step="0.5" value={gutter} onChange={(event) => setGutter(event.target.value)} disabled={busy} /></label>
      <label>Marge (mm)<input type="number" min="0" max="100" step="0.5" value={margin} onChange={(event) => setMargin(event.target.value)} disabled={busy} /></label>
      {mode === "step_repeat" && <label>Page à répéter<input type="number" min="1" max="50" value={sourcePage} onChange={(event) => setSourcePage(event.target.value)} disabled={busy} /></label>}
      <div className="imposition-file">{file
        ? <button type="button" className="primary-button" disabled={busy} onClick={() => void create(file)}>{busy ? "Création en cours…" : "Créer l’imposition"}</button>
        : <PdfDropzone label="Choisir le PDF à mettre en page" hint="Toutes les pages · le contenu reste vectoriel" disabled={busy} onFile={(nextFile) => void create(nextFile)} />}</div>
    </div>
    {busy && <p className="imposition-feedback" role="status">Création de l’imposition…</p>}
    {error && <p className="imposition-feedback error" role="alert">{error}</p>}
    {result && <div className="imposition-result" role="status"><div><strong>{result.outputPages} feuille(s) créée(s)</strong><span>{result.placedPages} pose(s) · {result.sheet.widthMm} × {result.sheet.heightMm} mm</span></div><button type="button" className="primary-button" onClick={download}><Download size={15} aria-hidden="true" /> Télécharger le PDF</button></div>}
    <div className="imposition-note"><Columns3 size={15} aria-hidden="true" /> Le mode N-up ne modifie pas le PDF source.</div>
  </section>;
}
