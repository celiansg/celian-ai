"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import type { PDFDocument } from "pdf-lib";
import { batFields } from "@/lib/bat/fields";
import { getLocalFile, listLocalFiles, saveLocalBat } from "@/lib/local-files/indexed-db";
import type { LocalFileMetadata } from "@/lib/local-files/types";
import type { LocalProject } from "@/lib/local-workspace/types";
import { listWorkspaceProjects } from "@/lib/workspace/repository";
import { firebaseAuth } from "@/lib/firebase/client";
import { getAiAuthorizationHeaders } from "@/lib/firebase/authorization";
import type { BatAssistResult } from "@/lib/bat/assist";
import { PdfPreview } from "./pdf-preview";
import { PdfDropzone } from "./pdf-dropzone";
import styles from "./bat-workspace.module.css";

type Source = { id: string; name: string; document: PDFDocument };
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
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcePage, setSourcePage] = useState(1);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [allSourcePages, setAllSourcePages] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<"source" | "draft" | "history" | null>(null);
  const [error, setError] = useState("");
  const [libraryUnavailable, setLibraryUnavailable] = useState(false);
  const [assistantText, setAssistantText] = useState("");
  const [assistantResult, setAssistantResult] = useState<BatAssistResult | null>(null);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantApplied, setAssistantApplied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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

  async function loadSources(getFiles: () => Promise<File[]>) {
    setBusy("source");
    setSourcePage(1);
    setSourceIndex(0);
    setAllSourcePages(true);
    setDraft(null);
    setError("");
    try {
      const files = await getFiles();
      const { openBatVisual } = await import("@/lib/bat/visual");
      const loaded: Source[] = [];
      for (const file of files) loaded.push({ id: crypto.randomUUID(), name: file.name, document: await openBatVisual(file) });
      setSources((items) => [...items, ...loaded]);
    } catch {
      setError("Un des PDF n’a pas pu être ouvert. Choisissez des fichiers non protégés de 15 Mo maximum et de 1 à 50 pages.");
    } finally {
      setBusy(null);
    }
  }

  async function runAssistant() {
    if (assistantBusy || assistantText.trim().length < 10) {
      setError("Collez au moins quelques informations sur le BAT avant l’analyse.");
      return;
    }
    setAssistantBusy(true);
    setAssistantApplied(false);
    setError("");
    try {
      const response = await fetch("/api/bat/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getAiAuthorizationHeaders() },
        body: JSON.stringify({ text: assistantText }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "L’aide IA n’a pas pu analyser ce texte.");
      setAssistantResult(payload as BatAssistResult);
    } catch (caught) {
      setAssistantResult(null);
      setError(caught instanceof Error ? caught.message : "L’aide IA n’a pas pu analyser ce texte.");
    } finally {
      setAssistantBusy(false);
    }
  }

  function applyAssistantResult() {
    if (!assistantResult || !formRef.current) return;
    for (const [key, value] of Object.entries(assistantResult.fields)) {
      if (!value) continue;
      const control = formRef.current.elements.namedItem(key);
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) control.value = value;
    }
    setAssistantApplied(true);
    setDraft(null);
    setError("");
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
      if (sources.length) {
        const { placeBatVisuals } = await import("@/lib/bat/visual");
        const selections = allSourcePages
          ? sources.flatMap((item, sourceIndex) => Array.from({ length: item.document.getPageCount() }, (_, index) => ({ sourceIndex, page: index + 1 })))
          : [{ sourceIndex, page: sourcePage }];
        const bytes = await placeBatVisuals(base, sources.map((item) => item.document), selections);
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
        <form ref={formRef} className={styles.panel} onSubmit={generate} onChange={() => { setDraft(null); setError(""); }}>
          <section className={styles.assist} aria-labelledby="bat-assist-title">
            <div className={styles.assistHead}>
              <div><div className="eyebrow">Aide IA · relecture obligatoire</div><h2 id="bat-assist-title">Remplir depuis un texte</h2></div>
              <span className={styles.assistBadge}>Gemini</span>
            </div>
            <p>Collez un mail, une demande client ou vos notes. L’IA propose uniquement les informations détectées ; rien n’est appliqué sans votre clic.</p>
            <textarea value={assistantText} onChange={(event) => setAssistantText(event.target.value)} rows={5} maxLength={16_000} placeholder="Ex. Société : Atelier Martin\nCommande : CMD-248\nProduit : 500 flyers A5, couché 135 g…" disabled={assistantBusy || !available} />
            <div className={styles.assistActions}>
              <button type="button" className="secondary-button" onClick={() => void runAssistant()} disabled={assistantBusy || !available || assistantText.trim().length < 10}>{assistantBusy ? "Analyse du texte…" : "Analyser avec l’IA"}</button>
              {assistantApplied && <span role="status">Champs appliqués, vérifiez-les avant génération.</span>}
            </div>
            {assistantResult && <div className={styles.assistResult} role="status">
              <div className={styles.assistResultTop}><strong>Proposition {assistantResult.confidence === "high" ? "fiable" : assistantResult.confidence === "medium" ? "à vérifier" : "incertaine"}</strong><button type="button" className="primary-button" onClick={applyAssistantResult}>Appliquer aux champs</button></div>
              <ul>{batFields.filter(([key]) => assistantResult.fields[key]).map(([key, label]) => <li key={key}><strong>{label}</strong><span>{assistantResult.fields[key]}</span></li>)}</ul>
              {assistantResult.warnings.length > 0 && <p className={styles.assistWarnings}><strong>À vérifier :</strong> {assistantResult.warnings.join(" · ")}</p>}
              {assistantResult.factsUsed.length > 0 && <details><summary>Sources détectées</summary><ul>{assistantResult.factsUsed.map((fact) => <li key={fact}>{fact}</li>)}</ul></details>}
            </div>}
          </section>
          <fieldset className={styles.form} disabled={Boolean(busy) || !available}>
            <legend>Informations du BAT</legend>
            <label className={styles.wide}>Projet
              <select value={projectId} onChange={(event) => {
                setProjectId(event.target.value);
                setSources([]);
                setSourcePage(1);
                setSourceIndex(0);
                setAllSourcePages(true);
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
                  void loadSources(async () => {
                    const record = await getLocalFile(id);
                    if (!record) throw new Error("Fichier introuvable.");
                    return [new File([record.blob], record.name, { type: record.mimeType })];
                  });
                }}>
                  <option value="">Ajouter un PDF depuis Fichiers</option>
                  {sourceFiles.map((file) => <option key={file.id} value={file.id}>{file.name}</option>)}
                </select>
              </label>
            )}
            <div className={styles.wide}><PdfDropzone label="Ajouter un ou plusieurs PDF client" hint="Jusqu’à 15 Mo par fichier · les pages seront conservées dans l’ordre" maxBytes={15 * 1024 * 1024} multiple disabled={Boolean(busy) || !available} onFile={(file) => void loadSources(async () => [file])} onFiles={(files) => void loadSources(async () => files)} /></div>
            {libraryUnavailable && <p className={styles.wide}>La bibliothèque locale est indisponible. Vous pouvez choisir un fichier sur cet appareil.</p>}
            {sources.length > 0 && (
              <div className={styles.wide}>
                <p className={styles.sourceName}><strong>{sources.length} fichier{sources.length > 1 ? "s" : ""}</strong> · {sources.reduce((total, item) => total + item.document.getPageCount(), 0)} page{sources.reduce((total, item) => total + item.document.getPageCount(), 0) > 1 ? "s" : ""} sélectionnée{sources.length > 1 || sources.some((item) => item.document.getPageCount() > 1) ? "s" : ""}</p>
                <ul className={styles.sourceList}>{sources.map((item, index) => <li key={item.id}><span>{item.name} · {item.document.getPageCount()} page{item.document.getPageCount() > 1 ? "s" : ""}</span><button type="button" className="text-action" onClick={() => { setSources((items) => items.filter((_, current) => current !== index)); setSourceIndex(0); setSourcePage(1); setDraft(null); }}>Retirer</button></li>)}</ul>
                <label>Pages à afficher sur les BAT
                  <select value={allSourcePages ? "all" : "one"} onChange={(event) => setAllSourcePages(event.target.value === "all")}>
                    <option value="all">Toutes les pages de tous les fichiers</option>
                    <option value="one">Une seule page</option>
                  </select>
                </label>
                {allSourcePages ? <p>Le BAT comportera une page par page source, dans l’ordre des fichiers et des pages.</p> : <div className={styles.sourceSelection}><label>Fichier
                  <select value={sourceIndex} onChange={(event) => { setSourceIndex(Number(event.target.value)); setSourcePage(1); }}>
                    {sources.map((item, index) => <option key={item.id} value={index}>{item.name}</option>)}
                  </select>
                </label><label>Page à insérer
                  <select value={sourcePage} onChange={(event) => setSourcePage(Number(event.target.value))}>
                    {sources[sourceIndex]?.document.getPages().map((_, index) => <option key={index} value={index + 1}>Page {index + 1}</option>)}
                  </select>
                </label></div>}
              </div>
            )}
            <p className={styles.wide}>Facultatif · chaque page source devient une page de BAT quand « Toutes les pages » est sélectionné. Les pages sont centrées et ajustées sans recadrage ; le fichier reste sur cet appareil.</p>
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
