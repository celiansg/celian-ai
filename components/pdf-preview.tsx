"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from "lucide-react";
import type { LocalFileRecord } from "@/lib/local-files/types";

type PdfPage = {
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void>; cancel: () => void };
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy: () => Promise<void> | void;
};

export function PdfPreview({ file }: { file: Pick<LocalFileRecord, "blob"> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [documentState, setDocumentState] = useState<PdfDocument | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);
    setDocumentState(null);
    setPageNumber(1);
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const loaded = await pdfjs.getDocument({ data: new Uint8Array(await file.blob.arrayBuffer()) }).promise as unknown as PdfDocument;
        if (cancelled) {
          await loaded.destroy();
          return;
        }
        setDocumentState(loaded);
        setStatus("ready");
      } catch (loadError) {
        if (!cancelled) {
          setStatus("error");
          setError(loadError instanceof Error ? loadError.message : "Le PDF n’a pas pu être ouvert.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    if (!documentState || !canvasRef.current) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;
    void documentState.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Le navigateur ne peut pas afficher la page PDF.");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      renderTask = page.render({ canvasContext: context, viewport });
      return renderTask.promise;
    }).catch((renderError: unknown) => {
      if (!cancelled) {
        setStatus("error");
        setError(renderError instanceof Error ? renderError.message : "La page PDF n’a pas pu être rendue.");
      }
    });
    return () => { cancelled = true; renderTask?.cancel(); };
  }, [documentState, pageNumber, scale]);

  useEffect(() => () => { void documentState?.destroy(); }, [documentState]);

  if (status === "loading") return <div className="pdf-preview-state" role="status">Ouverture du PDF…</div>;
  if (status === "error") return <div className="pdf-preview-state error" role="alert">Impossible d’afficher ce PDF. <small>{error}</small></div>;
  if (!documentState) return null;

  return (
    <div className="pdf-preview">
      <div className="pdf-preview-toolbar">
        <div className="pdf-page-controls"><button type="button" className="icon-button muted" disabled={pageNumber <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))} aria-label="Page précédente"><ChevronLeft size={16} /></button><span>Page <strong>{pageNumber}</strong> / {documentState.numPages}</span><button type="button" className="icon-button muted" disabled={pageNumber >= documentState.numPages} onClick={() => setPageNumber((current) => Math.min(documentState.numPages, current + 1))} aria-label="Page suivante"><ChevronRight size={16} /></button></div>
        <div className="pdf-zoom-controls"><button type="button" className="icon-button muted" onClick={() => setScale((current) => Math.max(0.5, Number((current - 0.1).toFixed(2))))} aria-label="Réduire le zoom"><Minus size={15} /></button><span>{Math.round(scale * 100)} %</span><button type="button" className="icon-button muted" onClick={() => setScale((current) => Math.min(2.5, Number((current + 0.1).toFixed(2))))} aria-label="Augmenter le zoom"><Plus size={15} /></button><button type="button" className="icon-button muted" onClick={() => setScale(1)} aria-label="Réinitialiser le zoom"><RotateCcw size={14} /></button></div>
      </div>
      <div className="pdf-canvas-scroll" aria-label={`Aperçu de la page ${pageNumber} sur ${documentState.numPages}`}><canvas ref={canvasRef} /></div>
    </div>
  );
}
