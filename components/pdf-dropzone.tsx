"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileUp } from "lucide-react";

type PdfDropzoneProps = {
  onFile: (file: File) => void;
  onFiles?: (files: File[]) => void;
  label: string;
  hint: string;
  disabled?: boolean;
  maxBytes?: number;
  multiple?: boolean;
};

export function PdfDropzone({ onFile, onFiles, label, hint, disabled = false, maxBytes = 25 * 1024 * 1024, multiple = false }: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function acceptFiles(selected: File[]) {
    if (!selected.length) return;
    const valid: File[] = [];
    for (const file of selected) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) { setError(`${file.name} n’est pas un PDF.`); continue; }
      if (file.size > maxBytes) { setError(`${file.name} dépasse la limite de ${Math.round(maxBytes / (1024 * 1024))} Mo.`); continue; }
      valid.push(file);
    }
    if (!valid.length) return;
    setError("");
    if (onFiles) onFiles(valid);
    else onFile(valid[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDragging(false);
    if (!disabled) acceptFiles(Array.from(event.dataTransfer.files));
  }

  return <div className={`pdf-dropzone${dragging ? " is-dragging" : ""}${disabled ? " is-disabled" : ""}`} role="group" aria-label={label} onClick={() => { if (!disabled) inputRef.current?.click(); }} onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
    <span className="pdf-dropzone-icon"><FileUp size={18} aria-hidden="true" /></span>
    <span className="pdf-dropzone-copy"><strong>{label}</strong><span>{dragging ? "Déposez le PDF ici" : "Glissez-déposez un PDF ou parcourez votre appareil"}</span><small>{hint}</small></span>
    <button type="button" className="secondary-button pdf-dropzone-button" disabled={disabled} onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}>Parcourir</button>
    <input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple={multiple} hidden disabled={disabled} onChange={(event) => { acceptFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    {error && <span className="pdf-dropzone-error" role="alert">{error}</span>}
  </div>;
}
