"use client";

import { Check, Mail, ShieldAlert, X } from "lucide-react";
import { ToolRenderer, type ToolRendererProps } from "@/components/agent-elements/tools/tool-renderer";

type ApprovalPart = ToolRendererProps["part"] & {
  approval?: { id?: string; approved?: boolean; reason?: string };
};

export function AgentToolRenderer({
  part: rawPart,
  nestedTools,
  chatStatus,
  onApproval,
}: ToolRendererProps & { onApproval?: (id: string, approved: boolean) => void }) {
  const part = rawPart as ApprovalPart;
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
          <p className={isRejected ? "agent-approval-result rejected" : "agent-approval-result"}><ShieldAlert size={14} /> {isRejected ? "Action refusée." : isApproved ? "Action approuvée et enregistrée." : "Action traitée."}</p>
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
