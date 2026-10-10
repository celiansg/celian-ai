"use client";

import { useState } from "react";
import type { PendingAction } from "@/lib/ai/types";
import { getAgent } from "@/lib/ai/agents";
import { AgentAvatar } from "./agent-avatar";
import { Icon } from "./icon";

export function PendingActionCard({ action, onResolved }: { action: PendingAction; onResolved: (status: "approved" | "rejected") => void }) {
  const [status, setStatus] = useState<PendingAction["status"]>(action.status);
  const agent = getAgent(action.agentId);
  function resolve(nextStatus: "approved" | "rejected") {
    setStatus(nextStatus);
    onResolved(nextStatus);
  }
  return <div className={`pending-action ${status !== "pending" ? `resolved-${status}` : ""}`}><div className="pending-action-head"><AgentAvatar agentId={action.agentId} size="sm" /><div><strong>{agent.handle} attend votre validation</strong><p>{action.description}</p></div><Icon name="clock" size={16} /></div>{status === "pending" ? <div className="pending-action-actions"><button className="secondary-button">Voir le brouillon</button><button className="secondary-button">Modifier</button><button className="reject-button" onClick={() => resolve("rejected")}>Refuser</button><button className="approve-button" onClick={() => resolve("approved")}><Icon name="check" size={14} />Approuver</button></div> : <div className="pending-action-resolved"><Icon name={status === "approved" ? "checkCircle" : "x"} size={16} />{status === "approved" ? "Action approuvée" : "Action refusée"}</div>}</div>;
}
