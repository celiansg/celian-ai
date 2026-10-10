"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { EmptyState } from "@/components/ui";

export default function FilesPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Array<{ name: string; size: string }>>([]);
  function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).map((file) => ({ name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} Ko` }));
    setFiles((current) => [...selected, ...current]);
  }
  return <div className="standalone-page"><div className="standalone-head"><div><div className="eyebrow">Workspace / Fichiers</div><h1>Vos fichiers, reliés au contexte</h1><p>Déposez un document pour permettre aux agents de l’analyser dans le bon projet.</p></div><><input ref={inputRef} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.svg,.docx,.xlsx,.txt,.zip" onChange={onFiles} /><button type="button" className="primary-button" onClick={() => inputRef.current?.click()}><Icon name="paperclip" size={16} />Ajouter un fichier</button></></div><button type="button" className="upload-zone" onClick={() => inputRef.current?.click()}><span><Icon name="folder" size={22} /></span><strong>Déposez un fichier ici</strong><small>PDF, PNG, JPG, SVG, DOCX, XLSX, TXT ou ZIP · 25 Mo max.</small></button><section className="file-list">{files.length ? files.map((file) => <div className="file-row" key={`${file.name}-${file.size}`}><span className="file-type"><Icon name="archive" size={18} /></span><div><strong>{file.name}</strong><span>{file.size} · Disponible pour les agents</span></div><span className="file-ready"><Icon name="checkCircle" size={16} />Prêt</span></div>) : <EmptyState icon="folder" title="Aucun fichier pour le moment" text="Ajoutez un premier document pour commencer." />}</section></div>;
}
