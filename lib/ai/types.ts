export type Provider = "gemini" | "openai";
export type ProviderPreference = Provider | "auto";

export type AgentId =
  | "celian"
  | "prod"
  | "client"
  | "design"
  | "dev"
  | "business"
  | "bts";

export type AgentEventType =
  | "agent_started"
  | "tool_called"
  | "tool_result"
  | "handoff_started"
  | "approval_required"
  | "agent_completed"
  | "agent_failed";

export type ToolPermission = "read" | "write" | "external" | "approval_required";

export interface GenerateRequest {
  system: string;
  prompt: string;
  context?: Record<string, unknown>;
  tools?: string[];
}

export interface GenerateResponse {
  text: string;
  toolCall?: {
    name: string;
    input: Record<string, unknown>;
  };
  handoff?: AgentId;
  requiresApproval?: boolean;
  approvalDescription?: string;
}

export interface AIProvider {
  readonly id: Provider;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface AgentDefinition {
  id: AgentId;
  handle: string;
  name: string;
  role: string;
  description: string;
  instructions: string;
  color: string;
  softColor: string;
  icon: string;
  provider: ProviderPreference;
  model: string;
  placeholder: string;
  suggestions: Array<{ label: string; value: string }>;
  tools: string[];
  capabilities: string[];
  permissions: ToolPermission[];
}

export interface AgentContext {
  userId: string;
  projectId?: string;
  conversationId?: string;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  facts?: Record<string, unknown>;
}

export interface AgentRunEvent {
  id: string;
  type: AgentEventType;
  agentId: AgentId;
  summary: string;
  toolName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PendingAction {
  id: string;
  agentId: AgentId;
  actionType: string;
  payload: Record<string, unknown>;
  description: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface AgentRunResult {
  status: "completed" | "waiting_for_approval" | "failed";
  answer: string;
  events: AgentRunEvent[];
  pendingAction?: PendingAction;
}
