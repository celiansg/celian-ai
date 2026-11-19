"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Download, Maximize2 } from "lucide-react";
import { addBleedToPdf, type BleedMethod } from "@/lib/bat/bleed";
import { PdfDropzone } from "@/components/pdf-dropzone";

export function BleedPanel({ file }: { file?: File }) {
  const [bleedMm, setBleedMm] = useState("3");
  const [dpi, setDpi] = useState<"150" | "300">("300");
  const [method, setMethod] = useState<BleedMethod>("edge_repeat");
  const [allPages, setAllPages] = useState(true);
  const [page, setPage] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ name: string; bytes: Uint8Array; pageCount: number; warning: string } | null>(null);

  useEffect(() => setResult(null), [file]);

  async function generate(file: File) {
    setBusy(true); setError(""); setResult(null);
    try {
      const output = await addBleedToPdf(file, { bleedMm: Number(bleedMm), dpi: Number(dpi) as 150 | 300, method, pages: allPages ? "all" : Number(page) });
      setResult({ name: file.name.replace(/\.pdf$/i, "") + `_${bleedMm}mm-fond-perdu.pdf`, bytes: output.bytes, pageCount: output.pageCount, warning: output.warning });
    } catch (generationError) { setError(generationError instanceof Error ? generationError.message : "Le fond perdu n’a pas pu être ajouté."); }
    finally { setBusy(false); }
  }

  function download() {
    if (!result) return;
    const copy = new ArrayBuffer(result.bytes.byteLength);
    new Uint8Array(copy).set(result.bytes);
    const url = URL.createObjectURL(new Blob([copy], { type: "application/pdf" }));
    const link = document.createElement("a"); link.href = url; link.download = result.name; link.click(); URL.revokeObjectURL(url);
  }

  return (
    <section id="bat-bleed" className="bleed-panel" aria-labelledby="bleed-title">
      <div className="bleed-head"><div><div className="eyebrow">Étape 2 · facultative</div><h2 id="bleed-title">Ajouter un fond perdu</h2><p>Crée une nouvelle copie PDF avec une zone périphérique. L’original reste inchangé.</p></div><Maximize2 size={22} aria-hidden="true" /></div>
      <div className="bleed-warning"><AlertTriangle size={16} aria-hidden="true" /><span>Cette fonction rasterise la page. Vérifiez les petits textes, QR codes et couleurs avant production.</span></div>
      <div className="bleed-controls">
        <label>Fond perdu (mm)<input type="number" min="0.1" max="20" step="0.1" value={bleedMm} onChange={(event) => setBleedMm(event.target.value)} disabled={busy} /></label>
        <label>Résolution<select value={dpi} onChange={(event) => setDpi(event.target.value as "150" | "300")} disabled={busy}><option value="300">300 DPI · qualité print</option><option value="150">150 DPI · fichier plus léger</option></select></label>
            <label>Méthode<select value={method} onChange={(event) => setMethod(event.target.value as BleedMethod)} disabled={busy}><option value="edge_repeat">Répéter le dernier pixel</option><option value="edge_stretch">Étirer le bord</option><option value="mirror">Effet miroir</option><option value="blank">Zone blanche</option></select></label>
        <label>Pages<select value={allPages ? "all" : "one"} onChange={(event) => setAllPages(event.target.value === "all")} disabled={busy}><option value="all">Toutes les pages</option><option value="one">Une page</option></select></label>
        {!allPages && <label>Numéro<input type="number" min="1" value={page} onChange={(event) => setPage(event.target.value)} disabled={busy} /></label>}
        <div className="bleed-file">{file
          ? <button type="button" className="primary-button" disabled={busy} onClick={() => void generate(file)}>{busy ? "Préparation en cours…" : "Ajouter le fond perdu"}</button>
          : <PdfDropzone label="Choisir le PDF à préparer" hint="Une nouvelle copie sera créée · toutes les pages sont conservées" disabled={busy} onFile={(nextFile) => void generate(nextFile)} />}</div>
      </div>
      {busy && <p className="bleed-feedback" role="status">Rasterisation à {dpi} DPI en cours…</p>}
      {error && <p className="bleed-feedback error" role="alert">{error}</p>}
      {result && <div className="bleed-result" role="status"><strong>{result.pageCount} page(s) préparée(s)</strong><span>{result.warning}</span><button type="button" className="primary-button" onClick={download}><Download size={15} aria-hidden="true" /> Télécharger le PDF</button></div>}
    </section>
  );
}
