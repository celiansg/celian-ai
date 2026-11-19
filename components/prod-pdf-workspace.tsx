"use client";

import { useState } from "react";
import { CheckCircle2, Crop, FileCheck2, FileOutput, FileSearch, Layers3, Scissors, UploadCloud } from "lucide-react";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { PdfPreview } from "@/components/pdf-preview";
import { PreflightPanel } from "@/components/preflight-panel";
import { BleedPanel } from "@/components/bleed-panel";
import { CutlinePanel } from "@/components/cutline-panel";
import { CropMarksPanel } from "@/components/crop-marks-panel";
import { ImpositionPanel } from "@/components/imposition-panel";
import { formatFileSize } from "@/lib/local-files/indexed-db";

type ToolId = "preflight" | "bleed" | "cutline" | "cropmarks" | "imposition";

const tools: Array<{ id: ToolId; label: string; description: string; icon: typeof FileSearch }> = [
  { id: "preflight", label: "Contrôler le PDF", description: "Pages, formats, fonds perdus, ressources", icon: FileSearch },
  { id: "bleed", label: "Ajouter un fond perdu", description: "Répétition, étirement, miroir ou blanc", icon: FileOutput },
  { id: "cutline", label: "Créer un tracé de découpe", description: "Rectangle vectoriel en ton direct", icon: Scissors },
  { id: "cropmarks", label: "Traits de coupe / format fini", description: "Ajouter ou supprimer les débords", icon: Crop },
  { id: "imposition", label: "Préparer une imposition", description: "Épreuve N-up ou répétition", icon: Layers3 },
];

export function ProdPdfWorkspace({ file: controlledFile, onFileChange }: { file?: File; onFileChange?: (file: File) => void }) {
  const [localFile, setLocalFile] = useState<File | undefined>();
  const file = controlledFile ?? localFile;
  const [activeTool, setActiveTool] = useState<ToolId>("preflight");

  function selectFile(nextFile: File) {
    setLocalFile(nextFile);
    onFileChange?.(nextFile);
    setActiveTool("preflight");
  }

  return (
    <section id="prod-pdf-workspace" className="prod-pdf-workspace" aria-labelledby="prod-pdf-title">
      <div className="prod-pdf-heading">
        <div>
          <div className="eyebrow">@Prod · poste de contrôle</div>
          <h2 id="prod-pdf-title">Importer, comprendre, préparer</h2>
          <p>Commence par ouvrir le PDF client. Tu gardes l’aperçu sous les yeux pendant que tu lances les contrôles et les préparations utiles.</p>
        </div>
        {file && <div className="prod-pdf-file-summary"><FileCheck2 size={17} aria-hidden="true" /><div><strong>{file.name}</strong><span>{formatFileSize(file.size)} · PDF local</span></div></div>}
      </div>

      {!file ? (
        <div className="prod-pdf-empty">
          <div className="prod-pdf-empty-copy"><span className="prod-pdf-empty-icon"><UploadCloud size={24} aria-hidden="true" /></span><div><strong>Commencer par importer le PDF client</strong><p>Le fichier reste sur cet appareil. Après import, l’aperçu et les actions s’ouvrent dans le même espace.</p></div></div>
          <PdfDropzone label="Importer le PDF à contrôler" hint="PDF · glisser-déposer ou choisir un fichier" onFile={selectFile} />
        </div>
      ) : (
        <div className="prod-pdf-workbench">
          <section className="prod-pdf-viewer" aria-labelledby="prod-viewer-title">
          <div className="prod-pdf-viewer-head"><div><div className="eyebrow">Aperçu document</div><h3 id="prod-viewer-title">Lecture du PDF</h3></div><PdfDropzone label="Changer de PDF" hint="Le nouveau fichier remplacera l’aperçu" onFile={selectFile} /></div>
            <PdfPreview file={{ blob: file }} />
          </section>
          <aside id="prod-action-rail" className="prod-action-rail" aria-labelledby="prod-actions-title">
            <div className="prod-action-rail-head"><div><div className="eyebrow">Actions</div><h3 id="prod-actions-title">Contrôler ce PDF</h3></div><span className="prod-live-dot">Prêt</span></div>
            <div className="prod-action-list">
              {tools.map(({ id, label, description, icon: Icon }) => <button type="button" key={id} className={`prod-action-item${activeTool === id ? " is-active" : ""}`} onClick={() => setActiveTool(id)} aria-pressed={activeTool === id}><span className="prod-action-icon"><Icon size={17} aria-hidden="true" /></span><span><strong>{label}</strong><small>{description}</small></span><span className="prod-action-chevron" aria-hidden="true">›</span></button>)}
              <a className="prod-action-item prod-action-link" href="#bat-generate"><span className="prod-action-icon"><FileOutput size={17} aria-hidden="true" /></span><span><strong>Créer le BAT officiel</strong><small>Remplir le modèle et placer les visuels</small></span><span className="prod-action-chevron" aria-hidden="true">›</span></a>
            </div>
            <div className="prod-action-detail" aria-live="polite">
              {activeTool === "preflight" && <PreflightPanel file={file} />}
              {activeTool === "bleed" && <BleedPanel file={file} />}
              {activeTool === "cutline" && <CutlinePanel file={file} />}
              {activeTool === "cropmarks" && <CropMarksPanel file={file} />}
              {activeTool === "imposition" && <ImpositionPanel file={file} />}
            </div>
          </aside>
        </div>
      )}
      {file && <p className="prod-pdf-note"><CheckCircle2 size={14} aria-hidden="true" /> L’original n’est pas modifié. Chaque action produit une nouvelle copie téléchargeable.</p>}
    </section>
  );
}
