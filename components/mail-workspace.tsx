"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Copy, Download, FileText, Save } from "lucide-react";
import { createMailDraft, mailKinds, type MailKind } from "@/lib/mail/draft";
import { assistedMailDraftSchema, type AssistedMailDraft } from "@/lib/mail/assisted";
import { getLocalFile } from "@/lib/local-files/indexed-db";
import type { LocalFileRecord } from "@/lib/local-files/types";
import { listLocalMailVersions, saveLocalMailVersion } from "@/lib/local-workspace/indexed-db";
import type { MailDraft, MailVersion } from "@/lib/mail/history";
import { getAiAuthorizationHeaders } from "@/lib/firebase/authorization";
import styles from "./bat-workspace.module.css";

export function MailWorkspace({ batId, versionId }: { batId?: string; versionId?: string }) {
  const [kind, setKind] = useState<MailKind>("bat");
  const [order, setOrder] = useState("");
  const [product, setProduct] = useState("");
  const [draft, setDraft] = useState<MailDraft | null>(null);
  const [savedDraft, setSavedDraft] = useState<MailDraft | null>(null);
  const [versions, setVersions] = useState<MailVersion[]>([]);
  const [sourceId, setSourceId] = useState(batId);
  const [bat, setBat] = useState<LocalFileRecord | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [loading, setLoading] = useState(Boolean(batId || versionId));
  const [historyStatus, setHistoryStatus] = useState<"loading" | "ready" | "error">("loading");
  const [missingVersion, setMissingVersion] = useState(false);
  const [missingBat, setMissingBat] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ message: string; error?: boolean } | null>(null);
  const [consent, setConsent] = useState(false);
  const [assisting, setAssisting] = useState(false);
  const [assistedDraft, setAssistedDraft] = useState<AssistedMailDraft | null>(null);
  const [assistError, setAssistError] = useState("");

  useEffect(() => {
    let current = true;
    void (async () => {
      let linkedBatId = versionId ? undefined : batId;
      try {
        const stored = await listLocalMailVersions();
        if (!current) return;
        setVersions(stored);
        setHistoryStatus("ready");
        if (versionId) {
          const restored = stored.find((version) => version.id === versionId);
          if (restored) {
            linkedBatId = restored.batId;
            setDraft(restored);
            setSavedDraft(restored);
          } else {
            setMissingVersion(true);
          }
        }
      } catch {
        if (!current) return;
        setHistoryStatus("error");
        if (versionId) setMissingVersion(true);
      }
      setSourceId(linkedBatId);
      try {
        if (!linkedBatId) return;
        const file = await getLocalFile(linkedBatId);
        if (!current) return;
        if (!file?.bat) { setMissingBat(true); return; }
        setBat(file);
        setOrder(file.bat.order ?? "");
        setProduct(file.bat.product ?? "");
        setKind(file.bat.revision > 1 ? "bat-revision" : "bat");
      } catch {
        if (current) setMissingBat(true);
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => { current = false; };
  }, [batId, versionId]);

  useEffect(() => {
    if (!bat) return;
    const url = URL.createObjectURL(bat.blob);
    setAttachmentUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bat]);

  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setDraft(createMailDraft({
      kind, order, product,
      request: String(form.get("request") ?? ""),
      signature: String(form.get("signature") ?? ""),
    }));
    setCopyStatus("");
    setSaveStatus(null);
    setAssistedDraft(null);
    setAssistError("");
  }

  async function generateWithGemini(form: HTMLFormElement) {
    const inputs = new FormData(form);
    const instructions = String(inputs.get("instructions") ?? "").trim();
    if (!consent || !instructions || assisting) {
      setAssistError("Ajoutez une consigne et confirmez l’envoi des champs à Gemini.");
      return;
    }
    setAssisting(true);
    setAssistError("");
    try {
      const response = await fetch("/api/mail/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getAiAuthorizationHeaders() },
        body: JSON.stringify({
          consent, kind, order, product, instructions,
          facts: String(inputs.get("facts") ?? ""),
          signature: String(inputs.get("signature") ?? ""),
          tone: inputs.get("tone"),
          length: inputs.get("length"),
          omitPrices: inputs.has("omitPrices"),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setAssistError(typeof payload?.error === "string" ? payload.error : "Gemini est indisponible.");
        return;
      }
      const result = assistedMailDraftSchema.safeParse(payload);
      if (!result.success) {
        setAssistError("La proposition Gemini ne peut pas être ouverte.");
        return;
      }
      editDraft({ subject: result.data.subject, body: result.data.body });
      setAssistedDraft(result.data);
    } catch {
      setAssistError("Impossible de contacter Gemini. Le modèle local reste disponible.");
    } finally {
      setAssisting(false);
    }
  }

  function editDraft(next: MailDraft) {
    setDraft(next);
    setCopyStatus("");
    setSaveStatus(null);
  }

  async function saveDraft() {
    if (!draft || saving) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      const version = await saveLocalMailVersion(draft, sourceId);
      setVersions((current) => [version, ...current]);
      setSavedDraft(version);
      setSaveStatus({ message: "Version enregistrée sur cet appareil." });
    } catch {
      setSaveStatus({ message: "Impossible d’enregistrer la version sur cet appareil.", error: true });
    } finally {
      setSaving(false);
    }
  }

  async function copyDraft() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText([draft.subject && `Objet : ${draft.subject}`, draft.body].filter(Boolean).join("\n\n"));
      setCopyStatus("Objet et message copiés.");
    } catch {
      setCopyStatus("Copie indisponible. Vous pouvez sélectionner et copier le texte.");
    }
  }

  return (
    <div className="standalone-page">
      <header className="standalone-head">
        <div>
          <div className="eyebrow">@Client</div>
          <h1>Rédiger un mail</h1>
          <p>Préparez un brouillon à relire puis copiez-le dans votre messagerie.</p>
        </div>
      </header>
      <div className={styles.layout}>
        <form className={styles.panel} onSubmit={generate}>
          <fieldset className={styles.form} disabled={loading || assisting}>
            <legend>Informations disponibles</legend>
            {loading && <p className={styles.wide} role="status">Ouverture du contexte local…</p>}
            {missingBat && <p className={styles.wide} role="alert">Ce BAT est indisponible sur cet appareil. Vous pouvez préparer un mail manuellement.</p>}
            <label className={styles.wide}>Type de mail
              <select value={kind} onChange={(event) => setKind(event.target.value as MailKind)}>
                {mailKinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>Référence de commande<input value={order} maxLength={160} onChange={(event) => setOrder(event.target.value)} /></label>
            <label>Produit<input value={product} maxLength={160} onChange={(event) => setProduct(event.target.value)} /></label>
            <label className={styles.wide}>Message à inclure
              <textarea name="request" rows={4} maxLength={4000} placeholder="Saisissez le texte à intégrer tel quel." />
            </label>
            <label className={styles.wide}>Signature<input name="signature" maxLength={160} /></label>
          </fieldset>
          <button className="primary-button" type="submit" disabled={loading || assisting}>
            <FileText size={16} aria-hidden="true" /> {draft ? "Recréer depuis les informations" : "Préparer le brouillon"}
          </button>
          <details className={styles.referenceFile}>
            <summary>Rédaction assistée avec Gemini</summary>
            <fieldset className={styles.form} disabled={loading || assisting}>
              <legend className="sr-only">Options Gemini</legend>
              <label className={styles.wide}>Informations à transmettre
                <textarea name="facts" rows={4} maxLength={6000} placeholder="Collez les faits ou extraits utiles." />
              </label>
              <label className={styles.wide}>Consignes de rédaction
                <textarea name="instructions" rows={3} maxLength={2000} placeholder="Ex. Demande une validation du BAT et reste concis." />
              </label>
              <label>Ton
                <select name="tone" defaultValue="naturel">
                  <option value="naturel">Professionnel naturel</option><option value="cordial">Cordial</option>
                  <option value="formel">Formel</option><option value="direct">Direct</option>
                </select>
              </label>
              <label>Longueur
                <select name="length" defaultValue="court">
                  <option value="court">Court</option><option value="standard">Standard</option><option value="détaillé">Détaillé</option>
                </select>
              </label>
              <label className={`${styles.wide} ${styles.check}`}><input type="checkbox" name="omitPrices" defaultChecked /> Omettre les prix</label>
              <label className={`${styles.wide} ${styles.check}`}>
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                J’autorise Gemini à recevoir les informations de rédaction, la référence, le produit et la signature saisis.
              </label>
              <p className={styles.wide}>Le PDF reste sur cet appareil.</p>
            </fieldset>
            <button className="secondary-button" type="button" disabled={!consent || loading || assisting}
              onClick={(event) => { if (event.currentTarget.form) void generateWithGemini(event.currentTarget.form); }}>
              {assisting ? "Rédaction en cours…" : "Rédiger avec Gemini"}
            </button>
            {assistError && <p className="file-feedback error" role="alert">{assistError}</p>}
          </details>
        </form>
        <section className={styles.panel} aria-labelledby="mail-draft-title">
          <h2 id="mail-draft-title">Brouillon à relire</h2>
          {missingVersion && <p role="alert">Cette version est indisponible sur cet appareil.</p>}
          {draft ? (
            <>
              <div className={styles.form}>
                <label className={styles.wide}>Objet<input maxLength={350} value={draft.subject} disabled={assisting} onChange={(event) => editDraft({ ...draft, subject: event.target.value })} /></label>
                <label className={styles.wide}>Corps du mail
                  <textarea value={draft.body} rows={9} maxLength={20_000} disabled={assisting} onChange={(event) => editDraft({ ...draft, body: event.target.value })} />
                </label>
              </div>
              <div className={styles.previewActions}>
                <button className="secondary-button" type="button" onClick={() => void copyDraft()}><Copy size={16} aria-hidden="true" /> Copier le mail</button>
                <button className="primary-button" type="button"
                  disabled={loading || historyStatus === "loading" || saving || !draft.body.trim() || (savedDraft?.subject === draft.subject && savedDraft.body === draft.body)}
                  onClick={() => void saveDraft()}><Save size={16} aria-hidden="true" /> {saving ? "Enregistrement…" : "Enregistrer une version"}</button>
                {copyStatus && <p role="status">{copyStatus}</p>}
                {saveStatus && <p role={saveStatus.error ? "alert" : "status"}>{saveStatus.message}</p>}
              </div>
            </>
          ) : <p>Générez le brouillon pour modifier son objet et son contenu.</p>}
          {assistedDraft && (
            <details className={styles.referenceFile}>
              <summary>Informations utilisées et points à relire</summary>
              {([
                ["Extraits repris", assistedDraft.sourceFactsUsed],
                ["Hypothèses", assistedDraft.assumptions],
                ["Avertissements", assistedDraft.warnings],
              ] as const).map(([label, items]) => items.length > 0 && (
                <div key={label}><h3>{label}</h3><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
              ))}
              {!assistedDraft.sourceFactsUsed.length && !assistedDraft.assumptions.length && !assistedDraft.warnings.length
                && <p>Aucun extrait ou avertissement signalé.</p>}
            </details>
          )}
          {bat && attachmentUrl && (
            <div className={styles.referenceFile}>
              <h3>BAT à joindre dans votre messagerie</h3>
              <p className={styles.sourceName}>{bat.name}</p>
              <a className="secondary-button" href={attachmentUrl} download={bat.name}><Download size={16} aria-hidden="true" /> Télécharger le BAT</a>
            </div>
          )}
        </section>
        <section className={`${styles.panel} ${styles.wide}`} aria-labelledby="mail-history-title">
          <h2 id="mail-history-title">Versions enregistrées</h2>
          {historyStatus === "loading" ? <p role="status">Chargement des versions…</p>
            : historyStatus === "error" ? <p role="status">L’historique local est indisponible.</p>
            : versions.length === 0 ? <p>Aucune version enregistrée sur cet appareil.</p>
            : <ul className={styles.history}>
              {versions.map((version) => (
                <li key={version.id}>
                  <div><strong>{version.subject || "Sans objet"}</strong>
                    <p><time dateTime={version.createdAt}>{new Date(version.createdAt).toLocaleString("fr-FR")}</time>
                      {version.batId && " · BAT associé"}</p>
                  </div>
                  <Link className="secondary-button" href={`/mail?version=${encodeURIComponent(version.id)}`}
                    aria-label={`Rouvrir ${version.subject || "Sans objet"}`}>Rouvrir</Link>
                </li>
              ))}
            </ul>}
        </section>
      </div>
    </div>
  );
}
