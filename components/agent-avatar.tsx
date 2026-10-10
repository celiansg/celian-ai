import { getAgent } from "@/lib/ai/agents";
import type { AgentId } from "@/lib/ai/types";
import Image from "next/image";
import { Icon } from "./icon";

export function AgentAvatar({ agentId, size = "md", showStatus = false }: { agentId: AgentId; size?: "sm" | "md" | "lg"; showStatus?: boolean }) {
  const agent = getAgent(agentId);
  return (
    <span className={`agent-avatar agent-avatar-${size}`} style={{ backgroundColor: agent.color }} title={agent.handle}>
      {agent.avatar ? <Image className="agent-avatar-image" src={agent.avatar} alt="" fill sizes="48px" /> : <Icon name={agent.icon} size={size === "sm" ? 14 : size === "lg" ? 22 : 18} strokeWidth={2} />}
      {showStatus ? <i className="agent-status-dot" /> : null}
    </span>
  );
}
