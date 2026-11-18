"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileUp } from "lucide-react";

type PdfDropzoneProps = {
  onFile: (file: File) => void;
  label: string;
  hint: string;
  disabled?: boolean;
  maxBytes?: number;
};

export function PdfDropzone({ onFile, label, hint, disabled = false, maxBytes = 25 * 1024 * 1024 }: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function accept(file: File | undefined) {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) { setError("Choisissez un fichier PDF."); return; }
    if (file.size > maxBytes) { setError(`Le fichier dépasse la limite de ${Math.round(maxBytes / (1024 * 1024))} Mo.`); return; }
    setError("");
    onFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDragging(false);
    if (!disabled) accept(event.dataTransfer.files[0]);
  }

  return <div className={`pdf-dropzone${dragging ? " is-dragging" : ""}${disabled ? " is-disabled" : ""}`} role="group" aria-label={label} onClick={() => { if (!disabled) inputRef.current?.click(); }} onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
    <span className="pdf-dropzone-icon"><FileUp size={18} aria-hidden="true" /></span>
    <span className="pdf-dropzone-copy"><strong>{label}</strong><span>{dragging ? "Déposez le PDF ici" : "Glissez-déposez un PDF ou parcourez votre appareil"}</span><small>{hint}</small></span>
    <button type="button" className="secondary-button pdf-dropzone-button" disabled={disabled} onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}>Parcourir</button>
    <input ref={inputRef} type="file" accept=".pdf,application/pdf" hidden disabled={disabled} onChange={(event) => { accept(event.target.files?.[0]); event.target.value = ""; }} />
    {error && <span className="pdf-dropzone-error" role="alert">{error}</span>}
  </div>;
}
