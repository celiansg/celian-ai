"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Archive, CheckCircle2, File, FileImage, FileText, FolderOpen, Trash2 } from "lucide-react";
import { FileDropzone } from "@/components/file-dropzone";
import { PdfPreview } from "@/components/pdf-preview";
import { EmptyState } from "@/components/ui";
import { deleteLocalFile, formatFileSize, getLocalFile, listLocalFiles, saveLocalFile, updateLocalFileProject } from "@/lib/local-files/indexed-db";
import type { LocalFileMetadata, LocalFileRecord } from "@/lib/local-files/types";
import { listWorkspaceProjects } from "@/lib/workspace/repository";
import type { LocalProject } from "@/lib/local-workspace/types";

function FileIcon({ kind }: { kind: LocalFileMetadata["kind"] }) {
  if (kind === "pdf") return <FileText size={18} aria-hidden="true" />;
  if (kind === "image") return <FileImage size={18} aria-hidden="true" />;
  if (kind === "archive") return <Archive size={18} aria-hidden="true" />;
  return <File size={18} aria-hidden="true" />;
}

function LocalImagePreview({ file }: { file: LocalFileRecord }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const nextUrl = URL.createObjectURL(file.blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);
  if (!url) return <div className="preview-placeholder">Préparation de l’aperçu…</div>;
  return <Image className="local-image-preview" src={url} alt={`Aperçu de ${file.name}`} width={1200} height={800} unoptimized />;
}

export default function FilesPage() {
  const [files, setFiles] = useState<LocalFileMetadata[]>([]);
  const [selected, setSelected] = useState<LocalFileRecord | null>(null);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([listLocalFiles(), listWorkspaceProjects()]).then(([nextFiles, nextProjects]) => { setFiles(nextFiles); setProjects(nextProjects); }).catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Le stockage local n’est pas disponible.")).finally(() => setLoading(false));
  }, []);

  async function handleUpload(file: File) {
    const metadata = await saveLocalFile(file);
    setFiles((current) => [metadata, ...current]);
    setError(null);
  }

  async function openFile(file: LocalFileMetadata) {
    try {
      setError(null);
      setSelected(await getLocalFile(file.id));
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Le fichier n’a pas pu être ouvert.");
    }
  }

  async function removeFile(file: LocalFileMetadata) {
    if (!window.confirm(`Supprimer « ${file.name} » de cet appareil ?`)) return;
    try {
      await deleteLocalFile(file.id);
      setFiles((current) => current.filter((item) => item.id !== file.id));
      setSelected((current) => current?.id === file.id ? null : current);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Le fichier n’a pas pu être supprimé.");
    }
  }

  async function assignProject(file: LocalFileMetadata, projectId: string) {
    try {
      const updated = await updateLocalFileProject(file.id, projectId);
      setFiles((current) => current.map((item) => item.id === file.id ? updated : item));
      setSelected((current) => current?.id === file.id ? { ...current, projectId: updated.projectId } : current);
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Le fichier n’a pas pu être relié au projet.");
    }
  }

  return (
    <div className="standalone-page files-page">
      <div className="standalone-head">
        <div><div className="eyebrow">Workspace / Fichiers</div><h1>Vos fichiers, reliés au contexte</h1><p>Déposez un document pour le garder sur cet appareil et l’ouvrir dans les outils autorisés.</p></div>
        <span className="local-storage-badge"><CheckCircle2 size={14} aria-hidden="true" /> Stockage local uniquement</span>
      </div>

      <FileDropzone onUpload={handleUpload} />
      {error ? <div className="file-feedback error page-feedback" role="alert">{error}</div> : null}

      <div className="files-workspace-grid">
        <section className="file-library-panel" aria-labelledby="file-library-title">
          <div className="detail-card-heading"><FolderOpen size={17} aria-hidden="true" /><h2 id="file-library-title">Bibliothèque locale</h2><span>{files.length}</span></div>
          {loading ? <div className="file-library-state" role="status">Lecture du stockage local…</div> : files.length ? <div className="file-library-list">{files.map((file) => <article className={`file-library-row${selected?.id === file.id ? " is-selected" : ""}`} key={file.id}><button type="button" className="file-library-open" onClick={() => void openFile(file)}><span className={`file-type ${file.kind}`}><FileIcon kind={file.kind} /></span><span className="file-library-copy"><strong>{file.name}</strong><small>{formatFileSize(file.size)} · {new Date(file.createdAt).toLocaleDateString("fr-FR")}</small></span></button>{file.bat ? <span className="file-project-select">{projects.find((project) => project.id === file.projectId)?.name ?? (file.projectId ? "Projet indisponible" : "Sans projet")}</span> : <select className="file-project-select" value={file.projectId ?? ""} onChange={(event) => void assignProject(file, event.target.value)} aria-label={`Projet de ${file.name}`}><option value="">Sans projet</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>}<span className="file-library-status">{file.bat ? "BAT" : "Local"}</span><button type="button" className="icon-button muted" onClick={() => void removeFile(file)} aria-label={`Supprimer ${file.name}`}><Trash2 size={15} /></button></article>)}</div> : <EmptyState icon="folder" title="Aucun fichier local" text="Déposez un premier PDF ou document pour commencer." />}
        </section>

        <section className="file-preview-panel" aria-labelledby="file-preview-title">
          <div className="detail-card-heading"><FileText size={17} aria-hidden="true" /><h2 id="file-preview-title">Aperçu</h2></div>
          {!selected ? <div className="file-preview-empty"><FolderOpen size={24} aria-hidden="true" /><strong>Sélectionnez un fichier</strong><p>Les fichiers restent sur cet appareil. La preview ne modifie jamais l’original.</p></div> : selected.kind === "pdf" ? <PdfPreview file={selected} /> : selected.kind === "image" ? <LocalImagePreview file={selected} /> : <div className="file-preview-empty"><File size={25} aria-hidden="true" /><strong>{selected.name}</strong><p>Ce format est stocké localement. Sa lecture métier sera ajoutée avec le module adapté.</p></div>}
        </section>
      </div>
    </div>
  );
}
