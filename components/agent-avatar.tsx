import { getAgent } from "@/lib/ai/agents";
import type { AgentId } from "@/lib/ai/types";
import { Icon } from "./icon";

export function AgentAvatar({ agentId, size = "md", showStatus = false }: { agentId: AgentId; size?: "sm" | "md" | "lg"; showStatus?: boolean }) {
  const agent = getAgent(agentId);
  const avatarStyle = agent.avatar
    ? { backgroundColor: agent.color, backgroundImage: `url(${agent.avatar})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundColor: agent.color };
  return (
    <span className={`agent-avatar agent-avatar-${size}`} style={avatarStyle} role="img" aria-label={`Avatar ${agent.handle}`} title={agent.handle}>
      {agent.avatar ? null : <Icon name={agent.icon} size={size === "sm" ? 14 : size === "lg" ? 22 : 18} strokeWidth={2} />}
      {showStatus ? <i className="agent-status-dot" /> : null}
    </span>
  );
}
