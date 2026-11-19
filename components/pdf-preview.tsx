"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import type { LocalFileRecord } from "@/lib/local-files/types";

type PdfPage = {
  getViewport: (params: { scale: number; rotation?: number }) => { width: number; height: number };
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void>; cancel: () => void };
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy: () => Promise<void> | void;
};

function PdfThumbnail({ documentState, pageNumber, rotation, selected, onSelect }: { documentState: PdfDocument; pageNumber: number; rotation: number; selected: boolean; onSelect: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;
    void documentState.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({ scale: 0.16, rotation });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      renderTask = page.render({ canvasContext: context, viewport });
      return renderTask.promise;
    }).catch(() => undefined);
    return () => { cancelled = true; renderTask?.cancel(); };
  }, [documentState, pageNumber, rotation]);

  return <button type="button" className={`pdf-thumbnail${selected ? " is-selected" : ""}`} onClick={onSelect} aria-label={`Afficher la page ${pageNumber}`} aria-current={selected ? "page" : undefined}><span className="pdf-thumbnail-canvas"><canvas ref={canvasRef} /></span><span>{pageNumber}</span></button>;
}

export function PdfPreview({ file, showThumbnails = false }: { file: Pick<LocalFileRecord, "blob">; showThumbnails?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const [documentState, setDocumentState] = useState<PdfDocument | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fitWidth, setFitWidth] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);
    setDocumentState(null);
    setPageNumber(1);
    setRotation(0);
    setFitWidth(false);
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
    if (!fitWidth || !documentState || !canvasScrollRef.current) return;
    let cancelled = false;
    void documentState.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasScrollRef.current) return;
      const baseViewport = page.getViewport({ scale: 1, rotation });
      const availableWidth = Math.max(240, canvasScrollRef.current.clientWidth - 36);
      setScale(Math.max(0.5, Math.min(2.5, Number((availableWidth / baseViewport.width).toFixed(2)))));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [documentState, fitWidth, pageNumber, rotation]);

  useEffect(() => {
    if (!documentState || !canvasRef.current) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;
    void documentState.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({ scale, rotation });
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
  }, [documentState, pageNumber, rotation, scale]);

  useEffect(() => () => { void documentState?.destroy(); }, [documentState]);

  if (status === "loading") return <div className="pdf-preview-state" role="status">Ouverture du PDF…</div>;
  if (status === "error") return <div className="pdf-preview-state error" role="alert">Impossible d’afficher ce PDF. <small>{error}</small></div>;
  if (!documentState) return null;

  return (
    <div className={`pdf-preview${showThumbnails ? " has-thumbnails" : ""}`}>
      <div className="pdf-preview-toolbar">
        <div className="pdf-page-controls"><button type="button" className="icon-button muted" disabled={pageNumber <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))} aria-label="Page précédente"><ChevronLeft size={16} /></button><label className="pdf-page-jump">Page <input type="number" min={1} max={documentState.numPages} value={pageNumber} onChange={(event) => setPageNumber(Math.min(documentState.numPages, Math.max(1, Number(event.target.value) || 1)))} aria-label="Numéro de page" /> / {documentState.numPages}</label><button type="button" className="icon-button muted" disabled={pageNumber >= documentState.numPages} onClick={() => setPageNumber((current) => Math.min(documentState.numPages, current + 1))} aria-label="Page suivante"><ChevronRight size={16} /></button></div>
        <div className="pdf-zoom-controls"><button type="button" className="icon-button muted" onClick={() => { setFitWidth(false); setScale((current) => Math.max(0.5, Number((current - 0.1).toFixed(2)))); }} aria-label="Réduire le zoom"><Minus size={15} /></button><span>{Math.round(scale * 100)} %</span><button type="button" className="icon-button muted" onClick={() => { setFitWidth(false); setScale((current) => Math.min(2.5, Number((current + 0.1).toFixed(2)))); }} aria-label="Augmenter le zoom"><Plus size={15} /></button><button type="button" className={`icon-button muted${fitWidth ? " is-active" : ""}`} onClick={() => setFitWidth((current) => !current)} aria-label="Ajuster à la largeur"><Maximize2 size={14} /></button><button type="button" className="icon-button muted" onClick={() => setRotation((current) => (current + 90) % 360)} aria-label="Pivoter l’aperçu"><RotateCw size={14} /></button><button type="button" className="icon-button muted" onClick={() => { setFitWidth(false); setScale(1); setRotation(0); }} aria-label="Réinitialiser l’aperçu"><RotateCcw size={14} /></button></div>
      </div>
      <div className="pdf-preview-body">
        {showThumbnails && <nav className="pdf-thumbnails" aria-label="Pages du PDF">{Array.from({ length: documentState.numPages }, (_, index) => <PdfThumbnail key={index + 1} documentState={documentState} pageNumber={index + 1} rotation={rotation} selected={pageNumber === index + 1} onSelect={() => setPageNumber(index + 1)} />)}</nav>}
        <div ref={canvasScrollRef} className="pdf-canvas-scroll" aria-label={`Aperçu de la page ${pageNumber} sur ${documentState.numPages}`}><canvas ref={canvasRef} /></div>
      </div>
    </div>
  );
}
