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
  createWorkspaceActivity,
} from "@/lib/workspace/repository";
import { firebaseAuth } from "@/lib/firebase/client";
import { getAiAuthorizationHeaders } from "@/lib/firebase/authorization";
import { persistAgentTask } from "@/lib/ai/workspace-task";
import { agentMaxSteps } from "@/lib/ai/config";
import { preflightPdf, preflightProfiles } from "@/lib/bat/preflight";
import { addBleedToPdf, type BleedMethod } from "@/lib/bat/bleed";
import { addCutlineToPdf, type CutlineMode } from "@/lib/bat/cutline";
import { imposePdf } from "@/lib/bat/imposition";
import { getLocalConversation, saveLocalConversation } from "@/lib/local-workspace/indexed-db";

type StagedFile = {
  id: string;
  file: File;
  previewUrl?: string;
};

const ACCEPTED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "svg", "docx", "xlsx", "txt", "zip"];

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
  const lastSentFilesRef = useRef<File[]>([]);
  const preparedUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    stagedFilesRef.current = stagedFiles;
  }, [stagedFiles]);

  useEffect(() => {
    return () => {
      // The ref intentionally holds URLs created by client-side PDF tools until unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const preparedUrls = preparedUrlsRef.current;
      stagedFilesRef.current.forEach((staged) => {
        if (staged.previewUrl) URL.revokeObjectURL(staged.previewUrl);
      });
      preparedUrls.forEach((url) => URL.revokeObjectURL(url));
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
    onFinish: () => {
      void createWorkspaceActivity({ description: `${agent.handle} a terminé une exécution conversationnelle.`, agentId: agent.id });
    },
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
      if (toolCall.dynamic) return;
      if (["preflightPdf", "addBleedPdf", "addCutlinePdf", "imposePdf"].includes(toolCall.toolName)) {
        const input = (toolCall.input ?? {}) as Record<string, unknown>;
        const file = lastSentFilesRef.current.find((candidate) => candidate.type === "application/pdf" || candidate.name.toLowerCase().endsWith(".pdf"));
        if (!file) {
          void addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output: { status: "not_available", message: "Aucun PDF joint à cette demande." } });
          return;
        }
        try {
          if (toolCall.toolName === "preflightPdf") {
            const profileId = typeof input.profile === "string" ? input.profile : "generic";
            const report = await preflightPdf(new Uint8Array(await file.arrayBuffer()), preflightProfiles[profileId] ?? preflightProfiles.generic);
            void addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output: { status: "completed", fileName: file.name, report } });
            return;
          }
          if (toolCall.toolName === "addBleedPdf") {
            const result = await addBleedToPdf(file, { bleedMm: Number(input.bleedMm), dpi: Number(input.dpi) as 150 | 300, method: String(input.method) as BleedMethod, pages: "all" });
            const downloadName = `${file.name.replace(/\.pdf$/i, "")}_${result.bleedMm}mm-fond-perdu.pdf`;
            const downloadUrl = URL.createObjectURL(new Blob([result.bytes.buffer as ArrayBuffer], { type: "application/pdf" }));
            preparedUrlsRef.current.push(downloadUrl);
            void addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output: { status: "completed", downloadName, downloadUrl, pageCount: result.pageCount, message: result.warning } });
            return;
          }
          if (toolCall.toolName === "addCutlinePdf") {
            const result = await addCutlineToPdf(new Uint8Array(await file.arrayBuffer()), { mode: String(input.mode) as CutlineMode, widthMm: Number(input.widthMm) || undefined, heightMm: Number(input.heightMm) || undefined, spotName: String(input.spotName || "CutContour"), lineWidthPt: Number(input.lineWidthPt || 0.25), pages: "all" });
            const downloadName = `${file.name.replace(/\.pdf$/i, "")}-trace-decoupe.pdf`;
            const downloadUrl = URL.createObjectURL(new Blob([result.bytes.buffer as ArrayBuffer], { type: "application/pdf" }));
            preparedUrlsRef.current.push(downloadUrl);
            void addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output: { status: "completed", downloadName, downloadUrl, pageCount: result.pageCount, spotName: result.spotName, message: result.warning } });
            return;
          }
          const sheet = input.sheet === "a3" ? [297, 420] : [210, 297];
          const result = await imposePdf(new Uint8Array(await file.arrayBuffer()), { sheetWidthMm: sheet[0], sheetHeightMm: sheet[1], columns: Number(input.columns || 2), rows: Number(input.rows || 2), gutterMm: Number(input.gutterMm || 5), marginMm: Number(input.marginMm || 5), mode: "n_up" });
          const downloadName = `${file.name.replace(/\.pdf$/i, "")}-imposition.pdf`;
          const downloadUrl = URL.createObjectURL(new Blob([result.bytes.buffer as ArrayBuffer], { type: "application/pdf" }));
          preparedUrlsRef.current.push(downloadUrl);
          void addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output: { status: "completed", downloadName, downloadUrl, outputPages: result.outputPages, message: result.warning } });
        } catch (caught) {
          void addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output: { status: "failed", message: caught instanceof Error ? caught.message : "Le contrôle PDF a échoué." } });
        }
        return;
      }
      if (toolCall.toolName !== "createWorkspaceTask") return;
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
    let active = true;
    void (async () => {
      try {
        const stored = await getLocalConversation(agent.id);
        if (active && stored?.messages && Array.isArray(stored.messages)) setMessages(stored.messages as UIMessage[]);
        if (active && !stored) {
          const fallback = window.localStorage.getItem(conversationStorageKey);
          if (fallback) {
            const parsed = JSON.parse(fallback) as UIMessage[];
            if (Array.isArray(parsed)) setMessages(parsed);
          }
        }
      } catch {
        // IndexedDB peut être indisponible en navigation privée ou après une migration interrompue.
        // Le repli localStorage permet de conserver l’ouverture et l’historique du chat.
        try {
          const fallback = window.localStorage.getItem(conversationStorageKey);
          if (active && fallback) {
            const parsed = JSON.parse(fallback) as UIMessage[];
            if (Array.isArray(parsed)) setMessages(parsed);
          }
        } catch {
          // Une conversation corrompue ne doit pas empêcher l’ouverture de l’agent.
        }
      } finally {
        if (active) setHistoryHydrated(true);
      }
    })();
    return () => { active = false; };
  }, [agent.id, conversationStorageKey, setMessages]);

  useEffect(() => {
    if (!historyHydrated) return;
    void saveLocalConversation({ agentId: agent.id, title: `Conversation avec ${agent.handle}`, messages }).catch(() => {
      try { window.localStorage.setItem(conversationStorageKey, JSON.stringify(messages)); } catch { /* Le chat reste utilisable si le quota local est atteint. */ }
    });
  }, [agent.handle, agent.id, conversationStorageKey, historyHydrated, messages]);

  const stageFiles = useCallback((incoming: File[]) => {
    setAttachmentError(null);
    const accepted: StagedFile[] = [];
    for (const file of incoming) {
      const extension = getExtension(file.name);
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        setAttachmentError(`${file.name} n’est pas un format pris en charge.`);
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
    lastSentFilesRef.current = files.map((staged) => staged.file);
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
