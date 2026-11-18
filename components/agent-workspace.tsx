"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
  type ChatStatus,
  type UIMessage,
} from "ai";
import { useChat } from "@ai-sdk/react";
import { AgentChat } from "@/components/agent-elements/agent-chat";
import { InputBar, type InputBarProps } from "@/components/agent-elements/input-bar";
import type { AgentDefinition } from "@/lib/ai/types";
import type { ModelChoice } from "@/lib/ai/models";
import { AgentHeader } from "@/components/agent-header";
import { AgentToolRenderer } from "@/components/agent-tool-renderer";
import type { AgentMode } from "@/components/agent-mode-selector";
import { listLocalFiles } from "@/lib/local-files/indexed-db";
import {
  createWorkspaceTask,
  listWorkspaceActivities,
  listWorkspaceProjects,
  listWorkspaceTasks,
} from "@/lib/workspace/repository";
import { firebaseAuth } from "@/lib/firebase/client";
import { getAiAuthorizationHeaders } from "@/lib/firebase/authorization";
import { persistAgentTask } from "@/lib/ai/workspace-task";
import { agentMaxSteps } from "@/lib/ai/config";

type StagedFile = {
  id: string;
  file: File;
  previewUrl?: string;
};

const ACCEPTED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "svg", "docx", "xlsx", "txt", "zip"];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function getExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function getPublicChatError(error: Error | undefined) {
  if (!error) return null;
  try {
    const payload = JSON.parse(error.message) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.length <= 240) return payload.error;
  } catch {
    // AI SDK errors are intentionally reduced to a stable user-facing message below.
  }
  const message = error.message.toLowerCase();
  if (message.includes("connectez-vous") || message.includes("firebase auth")) {
    return "Connectez-vous à Agents pour utiliser un fournisseur IA.";
  }
  if (message.includes("gemini") || message.includes("openai") || message.includes("provider")) {
    return "Aucun fournisseur IA n’est configuré. Ajoutez une clé côté serveur puis réessayez.";
  }
  return "La conversation n’a pas pu aboutir. Réessayez.";
}

async function readWorkspaceContext() {
  try {
    await firebaseAuth?.authStateReady();
    const [projects, tasks, activities, files] = await Promise.all([
      listWorkspaceProjects(), listWorkspaceTasks(), listWorkspaceActivities(), listLocalFiles(),
    ]);
    return { projects, tasks, activities, files };
  } catch {
    return undefined;
  }
}

export function AgentWorkspace({ agent, availableProviders }: { agent: AgentDefinition; availableProviders: { gemini: boolean; openai: boolean } }) {
  const [modelChoice, setModelChoice] = useState<ModelChoice>("auto");
  const [mode, setMode] = useState<AgentMode>("agent");
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [historyHydrated, setHistoryHydrated] = useState(false);
  const automaticRequests = useRef(0);
  const handledTaskCalls = useRef(new Set<string>());
  const stagedFilesRef = useRef(stagedFiles);

  useEffect(() => {
    stagedFilesRef.current = stagedFiles;
  }, [stagedFiles]);

  useEffect(() => {
    return () => {
      stagedFilesRef.current.forEach((staged) => {
        if (staged.previewUrl) URL.revokeObjectURL(staged.previewUrl);
      });
    };
  }, []);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      headers: getAiAuthorizationHeaders,
      body: async () => ({
        agentId: agent.id,
        mode,
        model: modelChoice,
        workspaceContext: await readWorkspaceContext(),
      }),
    }),
    [agent.id, mode, modelChoice],
  );

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    setMessages,
    addToolApprovalResponse,
    addToolOutput,
  } = useChat({
    id: `agent-${agent.id}`,
    transport,
    sendAutomaticallyWhen: (state) => {
      if (automaticRequests.current >= agentMaxSteps) return false;
      if (!lastAssistantMessageIsCompleteWithApprovalResponses(state)) {
        const parts = state.messages.at(-1)?.parts ?? [];
        const stepStart = parts.findLastIndex((part) => part.type === "step-start");
        const hasClientTool = parts.slice(stepStart + 1).some((part) =>
          part.type === "tool-Question" || part.type === "tool-createWorkspaceTask",
        );
        if (!hasClientTool || !lastAssistantMessageIsCompleteWithToolCalls(state)) return false;
      }
      automaticRequests.current += 1;
      return true;
    },
    onToolCall: async ({ toolCall }) => {
      if (toolCall.dynamic || toolCall.toolName !== "createWorkspaceTask") return;
      const { toolCallId, input } = toolCall;
      if (handledTaskCalls.current.has(toolCallId)) return;

      const limited = handledTaskCalls.current.size >= agentMaxSteps;
      if (!limited) handledTaskCalls.current.add(toolCallId);
      const result = limited
        ? { status: "not_persisted", message: "Limite de création atteinte pour cette demande." }
        : await persistAgentTask(input, agent.id, {
          listProjects: async () => {
            await firebaseAuth?.authStateReady();
            return listWorkspaceProjects();
          },
          createTask: async (task) => {
            await firebaseAuth?.authStateReady();
            return createWorkspaceTask(task);
          },
        });

      void addToolOutput({ tool: "createWorkspaceTask", toolCallId, output: result });
    },
  });

  const conversationStorageKey = `agents-conversation-${agent.id}`;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(conversationStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as UIMessage[];
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      // Une conversation corrompue ne doit pas empêcher l’ouverture de l’agent.
    } finally {
      setHistoryHydrated(true);
    }
  }, [conversationStorageKey, setMessages]);

  useEffect(() => {
    if (!historyHydrated) return;
    try {
      window.localStorage.setItem(conversationStorageKey, JSON.stringify(messages));
    } catch {
      // Le chat reste utilisable si le quota local est atteint.
    }
  }, [conversationStorageKey, historyHydrated, messages]);

  const stageFiles = useCallback((incoming: File[]) => {
    setAttachmentError(null);
    const accepted: StagedFile[] = [];
    for (const file of incoming) {
      const extension = getExtension(file.name);
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        setAttachmentError(`${file.name} n’est pas un format pris en charge.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setAttachmentError(`${file.name} dépasse la limite de 25 Mo.`);
        continue;
      }
      accepted.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      });
    }
    if (accepted.length > 0) setStagedFiles((current) => [...current, ...accepted]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setStagedFiles((current) => {
      const target = current.find((staged) => staged.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((staged) => staged.id !== id);
    });
  }, []);

  const clearStagedFiles = useCallback(() => {
    stagedFilesRef.current.forEach((staged) => {
      if (staged.previewUrl) URL.revokeObjectURL(staged.previewUrl);
    });
    stagedFilesRef.current = [];
    setStagedFiles([]);
  }, []);

  const handleSend = useCallback((message: { role: "user"; content: string }) => {
    automaticRequests.current = 0;
    handledTaskCalls.current.clear();
    const files = stagedFilesRef.current;
    if (files.length > 0) {
      const transfer = new DataTransfer();
      files.forEach((staged) => transfer.items.add(staged.file));
      void sendMessage({ text: message.content, files: transfer.files });
      clearStagedFiles();
      return;
    }
    void sendMessage({ text: message.content });
  }, [clearStagedFiles, sendMessage]);

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    const files = Array.from(event.clipboardData.files);
    if (files.length > 0) {
      event.preventDefault();
      stageFiles(files);
    }
  }, [stageFiles]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    stageFiles(Array.from(event.dataTransfer.files));
  }, [stageFiles]);

  const handleApproval = useCallback((id: string, approved: boolean) => {
    void addToolApprovalResponse({ id, approved });
  }, [addToolApprovalResponse]);

  const handleQuestionAnswer = useCallback(({ toolCallId, answer }: { toolCallId?: string; answer: unknown }) => {
    if (!toolCallId) return;
    const respond = addToolOutput as unknown as (payload: { tool: string; toolCallId: string; output: unknown }) => void;
    respond({ tool: "Question", toolCallId, output: { answer } });
  }, [addToolOutput]);

  const attachments = useMemo(() => ({
    onAttach: () => document.getElementById(`agent-file-input-${agent.id}`)?.click(),
    images: stagedFiles.filter((staged) => Boolean(staged.previewUrl)).map((staged) => ({ id: staged.id, filename: staged.file.name, size: staged.file.size, url: staged.previewUrl! })),
    files: stagedFiles.filter((staged) => !staged.previewUrl).map((staged) => ({ id: staged.id, filename: staged.file.name, size: staged.file.size })),
    onRemoveImage: removeFile,
    onRemoveFile: removeFile,
    onPaste: handlePaste,
    isDragOver,
  }), [agent.id, handlePaste, isDragOver, removeFile, stagedFiles]);

  const WorkspaceInputBar = useCallback((props: InputBarProps) => (
    <InputBar {...props} className="agent-input-bar" placeholder={agent.placeholder} enableImagePreview />
  ), [agent.placeholder]);

  const WorkspaceToolRenderer = useCallback((props: Parameters<typeof AgentToolRenderer>[0]) => (
    <AgentToolRenderer {...props} onApproval={handleApproval} />
  ), [handleApproval]);
  const publicChatError = getPublicChatError(error ?? undefined);

  return (
    <div className="agent-workspace-page">
      <div className="agent-workspace-shell">
        <AgentHeader agent={agent} model={modelChoice} mode={mode} onModelChange={setModelChoice} onModeChange={setMode} availableProviders={availableProviders} />
        <div className="agent-workspace-meta">
          <span>{agent.capabilities.slice(0, 4).join(" · ")}</span>
          {mode === "plan" ? <span className="agent-mode-hint">Les actions importantes commenceront par un plan public.</span> : <span>Les actions sensibles demandent votre validation.</span>}
        </div>
        <div
          className="agent-chat-surface"
          onDragEnter={(event) => { event.preventDefault(); setIsDragOver(true); }}
          onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragOver(false); }}
          onDrop={handleDrop}
        >
          <AgentChat
            messages={messages}
            onSend={handleSend}
            status={status as ChatStatus}
            onStop={() => void stop()}
            error={publicChatError ? new Error(publicChatError) : undefined}
            className="agent-chat-root"
            showCopyToolbar
            emptyStatePosition="center"
            emptySuggestionsPlacement="input"
            suggestions={agent.suggestions.map((suggestion) => ({ ...suggestion, id: suggestion.value }))}
            attachments={attachments}
            slots={{ InputBar: WorkspaceInputBar, ToolRenderer: WorkspaceToolRenderer }}
            questionTool={{
              submitLabel: "Continuer",
              skipLabel: "Passer",
              allowSkip: false,
              onAnswer: handleQuestionAnswer,
            }}
          />
          <input
            id={`agent-file-input-${agent.id}`}
            className="sr-only"
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.map((extension) => `.${extension}`).join(",")}
            onChange={(event) => {
              stageFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </div>
        {(attachmentError || publicChatError) && (
          <div className="agent-workspace-error" role="alert">
            {attachmentError ?? publicChatError}
            {publicChatError ? <button type="button" onClick={() => window.location.reload()}>Réessayer</button> : null}
          </div>
        )}
      </div>
    </div>
  );
}
