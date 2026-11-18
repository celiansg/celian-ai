"use client";

import { useRef, useState } from "react";
import { AlertCircle, FileText, Upload } from "lucide-react";
import { LOCAL_FILE_ACCEPT, LOCAL_FILE_MAX_SIZE, formatFileSize, validateLocalFile } from "@/lib/local-files/indexed-db";

type FileDropzoneProps = {
  onUpload: (file: File) => Promise<void>;
};

function formatMaxSize() {
  return `${Math.round(LOCAL_FILE_MAX_SIZE / 1024 / 1024)} Mo max.`;
}

/**
 * Adapted from the 21st.dev File Dropzone (demo id 19201).
 * The upload callback is intentionally storage-agnostic so the page can use
 * IndexedDB now and a consented repository later.
 */
export function FileDropzone({ onUpload }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<File[]>([]);

  async function processFiles(incoming: File[]) {
    if (!incoming.length || busy) return;
    setError(null);
    setBusy(true);
    const accepted: File[] = [];
    try {
      for (const file of incoming) {
        const validation = validateLocalFile(file);
        if (!validation.accepted) {
          setError(validation.message ?? "Ce fichier n’est pas accepté.");
          continue;
        }
        await onUpload(file);
        accepted.push(file);
      }
      if (accepted.length) setRecentFiles((current) => [...accepted, ...current].slice(0, 4));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Le fichier n’a pas pu être stocké localement.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="file-dropzone-stack">
      <div
        className={`file-dropzone${isDragging ? " is-dragging" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setIsDragging(false); void processFiles(Array.from(event.dataTransfer.files)); }}
      >
        <input ref={inputRef} className="sr-only" type="file" multiple accept={LOCAL_FILE_ACCEPT.join(",")} aria-label="Sélectionner des fichiers à stocker localement" onChange={(event) => void processFiles(Array.from(event.target.files ?? []))} />
        <span className="file-dropzone-icon" aria-hidden="true"><Upload size={20} /></span>
        <strong>{busy ? "Stockage local en cours…" : "Déposez vos fichiers ici"}</strong>
        <span>PDF, images, documents et archives · {formatMaxSize()}</span>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => inputRef.current?.click()}><Upload size={15} aria-hidden="true" /> Parcourir les fichiers</button>
      </div>
      {error ? <div className="file-feedback error" role="alert"><AlertCircle size={15} aria-hidden="true" />{error}</div> : null}
      {recentFiles.length ? <div className="file-dropzone-recent" aria-live="polite">{recentFiles.map((file) => <span key={`${file.name}-${file.lastModified}`}><FileText size={13} aria-hidden="true" />{file.name} · {formatFileSize(file.size)}</span>)}</div> : null}
    </div>
  );
}
