"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import type { PDFDocument } from "pdf-lib";
import { batFields } from "@/lib/bat/fields";
import { getLocalFile, listLocalFiles, saveLocalBat } from "@/lib/local-files/indexed-db";
import type { LocalFileMetadata } from "@/lib/local-files/types";
import type { LocalProject } from "@/lib/local-workspace/types";
import { listWorkspaceProjects } from "@/lib/workspace/repository";
import { firebaseAuth } from "@/lib/firebase/client";
import { PdfPreview } from "./pdf-preview";
import { PdfDropzone } from "./pdf-dropzone";
import styles from "./bat-workspace.module.css";

type Source = { name: string; document: PDFDocument };
type Draft = { name: string; blob: Blob; savedId?: string };

function DraftPreview({ draft }: { draft: Draft }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const nextUrl = URL.createObjectURL(draft.blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [draft]);

  return (
    <>
      <div className={styles.previewActions}>
        <span role="status">{draft.savedId ? "Brouillon enregistré sur cet appareil" : "Brouillon disponible au téléchargement"}</span>
        {url && <a className="primary-button" href={url} download={draft.name}><Download size={16} aria-hidden="true" /> Télécharger le PDF</a>}
        {draft.savedId && <Link className="secondary-button" href={`/mail?bat=${encodeURIComponent(draft.savedId)}`}>Préparer le mail avec @Client</Link>}
      </div>
      <PdfPreview file={draft} />
    </>
  );
}

export function BatWorkspace({ available, version, initialProjectId }: { available: boolean; version: string; initialProjectId?: string }) {
  const [files, setFiles] = useState<LocalFileMetadata[]>([]);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [projectStatus, setProjectStatus] = useState<"loading" | "ready" | "error">("loading");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [source, setSource] = useState<Source | null>(null);
  const [sourcePage, setSourcePage] = useState(1);
  const [allSourcePages, setAllSourcePages] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<"source" | "draft" | "history" | null>(null);
  const [error, setError] = useState("");
  const [libraryUnavailable, setLibraryUnavailable] = useState(false);

  useEffect(() => {
    let current = true;
    void listLocalFiles().then((items) => { if (current) setFiles(items); })
      .catch(() => { if (current) setLibraryUnavailable(true); })
      .finally(() => { if (current) setHistoryLoading(false); });
    void (async () => {
      try {
        await firebaseAuth?.authStateReady();
        const items = await listWorkspaceProjects();
        if (!current) return;
        setProjects(items);
        setProjectId(items.find((item) => item.id === initialProjectId)?.id ?? "");
        setProjectStatus("ready");
      } catch {
        if (current) setProjectStatus("error");
      }
    })();
    return () => { current = false; };
  }, [initialProjectId]);

  const history = files.filter((file) => file.bat && (!projectId || file.projectId === projectId));
  const sourceFiles = files.filter((file) => file.kind === "pdf" && !file.bat
    && (!projectId || !file.projectId || file.projectId === projectId));

  async function openRevision(id: string) {
    setBusy("history");
    setError("");
    try {
      const file = await getLocalFile(id);
      if (!file?.bat) throw new Error("Version introuvable.");
      setDraft({ name: file.name, blob: file.blob, savedId: file.id });
    } catch {
      setError("Impossible d’ouvrir cette version. Elle a peut-être été supprimée des fichiers.");
    } finally {
      setBusy(null);
    }
  }

  async function loadSource(getFile: () => Promise<File>) {
    setBusy("source");
    setSource(null);
    setSourcePage(1);
    setAllSourcePages(false);
    setDraft(null);
    setError("");
    try {
      const file = await getFile();
      const { openBatVisual } = await import("@/lib/bat/visual");
      setSource({ name: file.name, document: await openBatVisual(file) });
    } catch {
      setError("Ce PDF n’a pas pu être ouvert. Choisissez un fichier non protégé de 15 Mo maximum et de 1 à 50 pages.");
    } finally {
      setBusy(null);
    }
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !available || projectStatus === "loading") return;
    const form = new FormData(event.currentTarget);
    const fields = Object.fromEntries(batFields.map(([key]) => [key, String(form.get(key) ?? "").trim()]));
    setError("");
    setDraft(null);
    setBusy("draft");
    try {
      const response = await fetch("/api/bat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(typeof payload?.error === "string" ? payload.error : "La génération du BAT a échoué.");
        return;
      }
      const base = await response.arrayBuffer();
      let blob = new Blob([base], { type: "application/pdf" });
      if (source) {
        const { placeBatVisual } = await import("@/lib/bat/visual");
        const bytes = await placeBatVisual(base, source.document, allSourcePages ? "all" : sourcePage);
        blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      }
      try {
        if (projectId && !(await listWorkspaceProjects()).some((project) => project.id === projectId)) {
          throw new Error("Projet indisponible.");
        }
        const saved = await saveLocalBat(blob, {
          projectId: projectId || undefined, order: fields.order, company: fields.company, product: fields.product, templateVersion: version,
        });
        setFiles((items) => [saved, ...items]);
        setDraft({ name: saved.name, blob, savedId: saved.id });
      } catch {
        setDraft({ name: "BAT_brouillon.pdf", blob });
        setError("Impossible d’archiver cette version. Téléchargez le brouillon pour le conserver.");
      }
    } catch {
      setError("Le BAT n’a pas pu être produit. Vérifiez la connexion et le PDF client sélectionné.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div id="bat-generate">
      <header className="standalone-head">
        <div>
          <div className="eyebrow">Étape 5 · action principale</div>
          <h1>Créer le BAT officiel</h1>
          <p>Modèle officiel AFLPH Coloz · Révision {version} · A4 paysage</p>
        </div>
      </header>
      <div className={styles.layout}>
        <form className={styles.panel} onSubmit={generate} onChange={() => { setDraft(null); setError(""); }}>
          <fieldset className={styles.form} disabled={Boolean(busy) || !available}>
            <legend>Informations du BAT</legend>
            <label className={styles.wide}>Projet
              <select value={projectId} onChange={(event) => {
                setProjectId(event.target.value);
                setSource(null);
                setSourcePage(1);
                setAllSourcePages(false);
              }} disabled={projectStatus !== "ready"}>
                <option value="">Sans projet</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            {projectStatus === "loading" && <p className={styles.wide} role="status">Chargement des projets…</p>}
            {projectStatus === "error" && <p className={styles.wide}>Les projets sont indisponibles. Le brouillon sera classé sans projet.</p>}
            {projectStatus === "ready" && initialProjectId && !projects.some((project) => project.id === initialProjectId)
              && <p className={styles.wide} role="status">Le projet demandé n’est plus disponible.</p>}
            {batFields.map(([key, label, maxLength]) => (
              <label key={key} className={key === "remarks" ? styles.wide : undefined}>
                {label}
                {key === "remarks" ? <textarea name={key} rows={3} maxLength={maxLength} /> : <input name={key} maxLength={maxLength} />}
              </label>
            ))}
          </fieldset>
          <fieldset className={styles.form} disabled={Boolean(busy) || !available}>
            <legend>Visuel client</legend>
            {sourceFiles.length > 0 && (
              <label className={styles.wide}>Choisir dans Fichiers
                <select defaultValue="" onChange={(event) => {
                  const id = event.currentTarget.value;
                  if (!id) return;
                  event.currentTarget.value = "";
                  void loadSource(async () => {
                    const record = await getLocalFile(id);
                    if (!record) throw new Error("Fichier introuvable.");
                    return new File([record.blob], record.name, { type: record.mimeType });
                  });
                }}>
                  <option value="">Sélectionner un PDF local</option>
                  {sourceFiles.map((file) => <option key={file.id} value={file.id}>{file.name}</option>)}
                </select>
              </label>
            )}
            <div className={styles.wide}><PdfDropzone label="Ajouter le PDF client" hint="15 Mo maximum · PDF non protégé · 1 à 50 pages" maxBytes={15 * 1024 * 1024} disabled={Boolean(busy) || !available} onFile={(file) => void loadSource(async () => file)} /></div>
            {libraryUnavailable && <p className={styles.wide}>La bibliothèque locale est indisponible. Vous pouvez choisir un fichier sur cet appareil.</p>}
            {source && (
              <div className={styles.wide}>
                <p className={styles.sourceName}>{source.name}</p>
                {source.document.getPageCount() > 1 && (
                  <label>Pages du visuel
                    <select value={allSourcePages ? "all" : "one"} onChange={(event) => setAllSourcePages(event.target.value === "all")}>
                      <option value="one">Une page</option>
                      <option value="all">Toutes les pages ({source.document.getPageCount()})</option>
                    </select>
                  </label>
                )}
                {allSourcePages ? <p>Une page de BAT par page client, avec les mêmes informations sur chaque page.</p> : <label>Page à insérer
                  <select value={sourcePage} onChange={(event) => setSourcePage(Number(event.target.value))}>
                    {source.document.getPages().map((_, index) => <option key={index} value={index + 1}>Page {index + 1}</option>)}
                  </select>
                </label>}
                <button type="button" className="text-action" onClick={() => { setSource(null); setDraft(null); }}>Retirer le visuel</button>
              </div>
            )}
            <p className={styles.wide}>Facultatif · 15 Mo maximum · La page est centrée et ajustée sans recadrage. Les annotations et formulaires ne sont pas repris. Le fichier reste sur cet appareil.</p>
          </fieldset>
          {!available && <p role="alert">Le modèle officiel est introuvable. Placez-le dans le dossier des modèles du projet.</p>}
          {error && <p className="file-feedback error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={Boolean(busy) || !available || projectStatus === "loading"}>
            <FileText size={16} aria-hidden="true" />
            {busy === "source" ? "Lecture du PDF…" : busy === "draft" ? "Génération…" : "Générer le brouillon"}
          </button>
        </form>

        <section className={styles.panel} aria-labelledby="bat-preview-title">
          <h2 id="bat-preview-title">Aperçu du brouillon</h2>
          {draft ? <DraftPreview key={draft.name} draft={draft} /> : <p role="status">Le PDF apparaîtra ici après génération. Il devra être relu avant envoi.</p>}
        </section>
        <section className={`${styles.panel} ${styles.wide}`} aria-labelledby="bat-history-title">
          <h2 id="bat-history-title">Versions enregistrées</h2>
          {historyLoading ? <p role="status">Chargement des versions…</p>
            : libraryUnavailable ? <p role="status">L’historique local est indisponible.</p>
            : history.length === 0 ? <p>Aucun brouillon enregistré{projectId ? " pour ce projet" : ""}.</p>
            : <ul className={styles.history}>
              {history.map((file) => (
                <li key={file.id}>
                  <div><strong>{file.name}</strong><p>{projects.find((project) => project.id === file.projectId)?.name
                    ?? (file.projectId ? "Projet indisponible" : "Sans projet")} · Modèle {file.bat?.templateVersion}</p></div>
                  <button className="secondary-button" type="button" disabled={Boolean(busy)}
                    aria-label={`Ouvrir ${file.name}`} onClick={() => void openRevision(file.id)}>Ouvrir</button>
                </li>
              ))}
            </ul>}
        </section>
      </div>
    </div>
  );
}
