"use client";

import { Check, Download, FileSearch, Mail, ShieldAlert, X } from "lucide-react";
import { ToolRenderer, type ToolRendererProps } from "@/components/agent-elements/tools/tool-renderer";

type ApprovalPart = ToolRendererProps["part"] & {
  approval?: { id?: string; approved?: boolean; reason?: string };
};

const pdfToolLabels: Record<string, string> = {
  preflightPdf: "Contrôle prépresse du PDF",
  addBleedPdf: "Préparation du fond perdu",
  addCutlinePdf: "Création du tracé de découpe",
  imposePdf: "Préparation de l’imposition",
};

function PdfToolCard({ part, toolName }: { part: ApprovalPart; toolName: string }) {
  const output = (part.output ?? {}) as Record<string, unknown>;
  const isPending = part.state !== "output-available" && part.state !== "output-error";
  const report = output.report as { status?: string; summary?: { info: number; warning: number; error: number; unsupported: number }; file?: { pages: number } } | undefined;
  const failed = part.state === "output-error" || output.status === "failed" || output.status === "not_available";
  return <section className={`agent-pdf-tool ${failed ? "is-error" : ""}`} aria-live="polite">
    <div className="agent-pdf-tool-title"><FileSearch size={15} aria-hidden="true" /><strong>{pdfToolLabels[toolName] ?? "Action PDF"}</strong><span>{isPending ? "En cours…" : failed ? "À vérifier" : "Terminé"}</span></div>
    {isPending ? <p>Le fichier joint est analysé localement. Aucun octet du PDF n’est déclaré comme enregistré côté serveur.</p>
      : report?.summary ? <p>{report.file?.pages ?? 0} page(s) · {report.summary.error} erreur(s) · {report.summary.warning} avertissement(s) · statut {report.status ?? "à vérifier"}</p>
      : <p>{String(output.message ?? (failed ? "L’action n’a pas pu être réalisée." : "Copie préparée sans modifier l’original."))}</p>}
    {typeof output.downloadUrl === "string" && typeof output.downloadName === "string" && <a className="agent-pdf-download" href={output.downloadUrl} download={output.downloadName}><Download size={14} aria-hidden="true" /> Télécharger {output.downloadName}</a>}
  </section>;
}

export function AgentToolRenderer({
  part: rawPart,
  nestedTools,
  chatStatus,
  onApproval,
}: ToolRendererProps & { onApproval?: (id: string, approved: boolean) => void }) {
  const part = rawPart as ApprovalPart;
  const pdfToolName = part.type.startsWith("tool-") ? part.type.slice(5) : "";
  if (pdfToolName in pdfToolLabels) return <PdfToolCard part={part} toolName={pdfToolName} />;
  if (part.type === "tool-sendClientEmail") {
    const input = (part.input ?? {}) as Record<string, unknown>;
    const approvalId = part.approval?.id;
    const isWaiting = part.state === "approval-requested" && Boolean(approvalId);
    const isApproved = part.state === "approval-responded" && part.approval?.approved === true;
    const isRejected = part.state === "approval-responded" && part.approval?.approved === false;

    return (
      <section className="agent-approval-card" aria-live="polite">
        <div className="agent-approval-heading"><span className="agent-approval-icon"><Mail size={16} /></span><div><strong>Validation requise</strong><span>@Client souhaite préparer l’envoi d’un email</span></div></div>
        <dl className="agent-email-preview">
          <div><dt>Destinataire</dt><dd>{String(input.recipient ?? "Non renseigné")}</dd></div>
          <div><dt>Objet</dt><dd>{String(input.subject ?? "Sans objet")}</dd></div>
          <div><dt>Message</dt><dd>{String(input.body ?? "")}</dd></div>
        </dl>
        {isWaiting ? (
          <div className="agent-approval-actions">
            <button type="button" className="agent-approval-reject" onClick={() => onApproval?.(approvalId!, false)}><X size={14} /> Refuser</button>
            <button type="button" className="agent-approval-approve" onClick={() => onApproval?.(approvalId!, true)}><Check size={14} /> Approuver</button>
          </div>
        ) : (
          <p className={isRejected ? "agent-approval-result rejected" : "agent-approval-result"}><ShieldAlert size={14} /> {isRejected ? "Action refusée." : isApproved ? "Validation reçue. Aucun email n’a été envoyé : Gmail n’est pas connecté." : "Action traitée."}</p>
        )}
      </section>
    );
  }

  if (part.type === "tool-PlanWrite" && part.state === "approval-requested" && part.approval?.id) {
    const planInput = (part.input ?? {}) as Record<string, unknown>;
    const planPart = { ...part, input: { ...planInput, approveLabel: "Approuver le plan", onApprove: () => onApproval?.(part.approval!.id!, true) } };
    return <ToolRenderer part={planPart} nestedTools={nestedTools} chatStatus={chatStatus} />;
  }

  return <ToolRenderer part={part} nestedTools={nestedTools} chatStatus={chatStatus} />;
}
