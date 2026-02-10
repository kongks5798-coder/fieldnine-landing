/* eslint-disable react-hooks/preserve-manual-memoization */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { parseAIResponse } from "@/lib/parseAIResponse";
import { validateJS, sanitizeJS } from "@/lib/codeValidator";
import TaskProgressCard, { type TaskStage } from "./TaskProgressCard";
import DeployReportCard, { type DeployReportData } from "./DeployReportCard";
import {
  Send,
  Sparkles,
  Copy,
  Check,
  Code2,
  Bot,
  User,
  Loader2,
  GitCommit,
  FileText,
  AlertCircle,
  RefreshCw,
  Activity,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Hammer,
  Lightbulb,
  Pencil,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import type { IDEAction } from "@/lib/ideActions";

interface FileChange {
  path: string;
  content: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface SystemMessage {
  id: string;
  afterMessageId: string;
  content: string;
  type: "commit-report" | "error" | "normal" | "checkpoint" | "deploy-report";
  timestamp: string;
  commitSha?: string;
  filesChanged?: string[];
  deployReportData?: DeployReportData;
}

interface CurrentFile {
  name: string;
  content: string;
}

/* ===== Agent Mode ===== */
type AgentMode = "build" | "plan" | "edit" | "agent";

const AGENT_MODES: { id: AgentMode; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "build", label: "Build", icon: Hammer, desc: "코드 생성 + 자동 배포" },
  { id: "plan", label: "Plan", icon: Lightbulb, desc: "설계만, 코드 없음" },
  { id: "edit", label: "Edit", icon: Pencil, desc: "변경 파일만 출력" },
  { id: "agent", label: "Agent", icon: Cpu, desc: "AI 자율 에이전트" },
];

/* ===== Progress Events ===== */
interface ProgressEvent {
  id: string;
  type: "stream-start" | "stream-end" | "file-insert" | "commit-start" | "commit-success" | "commit-fail";
  message: string;
  timestamp: string;
  status: "done" | "pending" | "error";
}

interface AIChatPanelProps {
  onInsertCode: (code: string, fileName: string, auto?: boolean) => void;
  activeFile: string;
  currentFiles?: Record<string, CurrentFile>;
  onShadowCommit?: (files: FileChange[], message: string) => Promise<boolean>;
  onDeployStatusChanged?: (status: string) => void;
  initialPrompt?: string;
  onGitRestore?: (sha: string) => void;
  externalMessage?: string;
  onExternalMessageConsumed?: () => void;
  autoTestCompleted?: boolean;
  onAutoTestReportShown?: () => void;
  livePreviewUrl?: string | null;
  errorFixState?: { message: string; phase: "detecting" | "fixing" | "done" } | null;
  onIDEAction?: (action: IDEAction) => void;
}

function now() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

const WELCOME_TEXT =
  "무엇을 만들까요? 기능을 지시하면 코드 생성 → 자동 배포합니다.";

const AI_MODELS = [
  { id: "auto", label: "Auto", cost: "auto" },
  { id: "claude-sonnet", label: "Claude Sonnet", cost: "$3/1M" },
  { id: "gpt-4o", label: "GPT-4o", cost: "$2.5/1M" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", cost: "$0.15/1M" },
] as const;

type AIModelId = (typeof AI_MODELS)[number]["id"];

export default function AIChatPanel({ onInsertCode, currentFiles, onShadowCommit, initialPrompt, onGitRestore, externalMessage, onExternalMessageConsumed, autoTestCompleted, onAutoTestReportShown, livePreviewUrl, errorFixState, onIDEAction }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [apiStatus, setApiStatus] = useState<"ok" | "error">("ok");
  const [selectedModel, setSelectedModel] = useState<AIModelId>("auto");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [dailyUsage, setDailyUsage] = useState({ count: 0, limit: 100 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initialPromptSentRef = useRef(false);
  const autoFixRetryRef = useRef(0); // cumulative auto-fix counter (max 2 per conversation, never resets)

  /* ===== Agent Mode State ===== */
  const [agentMode, setAgentMode] = useState<AgentMode>("build");

  /* ===== Progress State ===== */
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([]);
  const [showProgress, setShowProgress] = useState(false);

  /* ===== Auto-Inserted Block Tracking ===== */
  const [autoInsertedBlocks, setAutoInsertedBlocks] = useState<Set<string>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const toggleBlockExpand = useCallback((blockId: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }, []);

  /* ===== Task Stage Tracking (per-message 4-stage card) ===== */
  const [messageStages, setMessageStages] = useState<Record<string, TaskStage[]>>({});

  const initStages = useCallback((messageId: string) => {
    setMessageStages((prev) => ({
      ...prev,
      [messageId]: [
        { id: "planning", label: "계획 수립", emoji: "🧠", status: "active" },
        { id: "coding", label: "코드 작성", emoji: "📝", status: "pending" },
        { id: "applying", label: "파일 적용", emoji: "💾", status: "pending" },
        { id: "testing", label: "검증", emoji: "🧪", status: "pending" },
      ],
    }));
  }, []);

  const advanceStage = useCallback((messageId: string, stageId: string, detail?: string) => {
    setMessageStages((prev) => {
      const stages = prev[messageId];
      if (!stages) return prev;
      const stageIdx = stages.findIndex((s) => s.id === stageId);
      if (stageIdx === -1) return prev;
      const updated = stages.map((s, idx) => {
        if (idx < stageIdx) return { ...s, status: "done" as const, detail: s.detail || detail };
        if (idx === stageIdx) return { ...s, status: "done" as const, detail: detail ?? s.detail };
        if (idx === stageIdx + 1) return { ...s, status: "active" as const };
        return s;
      });
      return { ...prev, [messageId]: updated };
    });
  }, []);

  const completeAllStages = useCallback((messageId: string) => {
    setMessageStages((prev) => {
      const stages = prev[messageId];
      if (!stages) return prev;
      return {
        ...prev,
        [messageId]: stages.map((s) =>
          s.status === "pending" || s.status === "active" ? { ...s, status: "done" as const } : s
        ),
      };
    });
  }, []);

  const skipToPlanning = useCallback((messageId: string) => {
    setMessageStages((prev) => {
      const stages = prev[messageId];
      if (!stages) return prev;
      return {
        ...prev,
        [messageId]: stages.map((s) =>
          s.id === "planning" ? { ...s, status: "done" as const } : { ...s, status: "done" as const }
        ),
      };
    });
  }, []);

  const addProgressEvent = useCallback((type: ProgressEvent["type"], message: string, status: ProgressEvent["status"]) => {
    setProgressEvents((prev) => [
      ...prev.slice(-19),
      {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        type,
        message,
        timestamp: now(),
        status,
      },
    ]);
  }, []);

  /* ===== Chat History Persistence (localStorage) ===== */
  const chatStorageKey = "f9-chat-history";
  useEffect(() => {
    try {
      const saved = localStorage.getItem(chatStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(chatStorageKey, JSON.stringify(messages.slice(-50))); } catch {}
    }
  }, [messages, chatStorageKey]);

  /* ===== External Message Handler (for AI Fix) ===== */
  useEffect(() => {
    if (externalMessage && !isStreaming && !isCommitting) {
      sendToAI(externalMessage);
      onExternalMessageConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, systemMessages, isStreaming, isCommitting]);

  const shadowCommit = useCallback(
    async (fileChanges: FileChange[], commitMsg: string): Promise<{ success: boolean; sha?: string }> => {
      if (onShadowCommit) {
        const ok = await onShadowCommit(fileChanges, commitMsg);
        return { success: ok };
      }
      try {
        const res = await fetch("/api/save-code", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: fileChanges, message: commitMsg }),
        });
        if (!res.ok) return { success: false };
        const data = await res.json();
        return { success: data.success === true, sha: data.commitSha };
      } catch {
        return { success: false };
      }
    },
    [onShadowCommit],
  );

  const addSystemMessage = useCallback(
    (afterMessageId: string, content: string, type: SystemMessage["type"], extra?: { commitSha?: string; filesChanged?: string[] }) => {
      setSystemMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          afterMessageId,
          content,
          type,
          timestamp: now(),
          ...extra,
        },
      ]);
    },
    [],
  );

  /* ===== Pending Deploy Report (stashed on commit success, shown after autoTest) ===== */
  const pendingDeployReportRef = useRef<{ afterMessageId: string; data: DeployReportData } | null>(null);

  useEffect(() => {
    if (autoTestCompleted && pendingDeployReportRef.current) {
      const { afterMessageId, data } = pendingDeployReportRef.current;
      setSystemMessages((prev) => [
        ...prev,
        {
          id: `deploy-report-${Date.now()}`,
          afterMessageId,
          content: "",
          type: "deploy-report" as const,
          timestamp: data.timestamp,
          deployReportData: data,
        },
      ]);
      pendingDeployReportRef.current = null;
      onAutoTestReportShown?.();
    }
  }, [autoTestCompleted, onAutoTestReportShown]);

  const handleAIResponseComplete = useCallback(
    async (messageId: string, content: string) => {
      // Plan mode: no code insertion or commit
      if (agentMode === "plan") return;

      const parsed = parseAIResponse(content);
      if (parsed.codeBlocks.length === 0) return;

      // Sanitize JS code blocks (strip stray "pp.js" lines etc.)
      for (const block of parsed.codeBlocks) {
        if (block.targetFile.endsWith(".js") || block.targetFile.endsWith(".ts")) {
          block.code = sanitizeJS(block.code);
        }
      }

      // Validate JS code blocks before insertion
      const jsBlocks = parsed.codeBlocks.filter(
        (b) => b.targetFile.endsWith(".js") || b.targetFile.endsWith(".ts")
      );
      const validationErrors: string[] = [];
      for (const block of jsBlocks) {
        const result = validateJS(block.code);
        if (!result.valid) {
          validationErrors.push(`[${block.targetFile}] ${result.errors.join("; ")}`);
        }
      }

      // If JS has errors and we haven't exceeded the conversation-wide auto-fix limit, auto-fix
      if (validationErrors.length > 0 && autoFixRetryRef.current < 2) {
        autoFixRetryRef.current += 1;
        addProgressEvent("file-insert", `코드 검증 실패 — 자동 수정 요청 (${autoFixRetryRef.current}/2)`, "pending");

        // Still insert the code (so user can see it), but also auto-request fix
        for (const block of parsed.codeBlocks) {
          onInsertCode(block.code, block.targetFile, true);
        }

        // Auto-send fix request
        const fixPrompt = `방금 생성한 코드에 다음 오류가 있습니다. 전체 파일을 다시 출력해서 수정해주세요:\n\n${validationErrors.join("\n")}\n\n중요: 모든 변수를 선언 후 사용하고, 문법 오류가 없어야 합니다.`;

        // Add fix request as user message and re-send
        const fixMsg: ChatMessage = {
          id: `user-autofix-${Date.now()}`,
          role: "user",
          content: fixPrompt,
        };
        setMessages((prev) => [...prev, fixMsg]);

        // Trigger sendToAI after a short delay (allows state to update)
        setTimeout(() => {
          sendToAIRef.current?.(fixPrompt);
        }, 500);
        return;
      }

      // If still has errors but auto-fix limit reached, insert anyway + warn user
      if (validationErrors.length > 0) {
        addProgressEvent("file-insert", "자동 수정 한도 초과 — 코드 삽입 (수동 확인 필요)", "error");
      }

      // NOTE: No reset of autoFixRetryRef — it's cumulative for the entire conversation

      for (const block of parsed.codeBlocks) {
        onInsertCode(block.code, block.targetFile, true);
        addProgressEvent("file-insert", `${block.targetFile} 자동 삽입`, "done");
      }

      // Lifecycle 4: File insertion done → applying done, testing active
      advanceStage(messageId, "applying", `${parsed.codeBlocks.length}개 파일 삽입 완료`);

      // Mark blocks as auto-inserted in UI
      const blockIds = parsed.codeBlocks.map((_, idx) => `${messageId}-code-${idx}`);
      setAutoInsertedBlocks((prev) => {
        const next = new Set(prev);
        for (const id of blockIds) next.add(id);
        return next;
      });

      addProgressEvent("commit-start", "GitHub 커밋 중...", "pending");
      setIsCommitting(true);
      const fileChanges = parsed.codeBlocks.map((b) => ({
        path: b.targetFile,
        content: b.code,
      }));
      const commitMsg = `feat(ai): ${parsed.explanation.slice(0, 50)}`;
      const result = await shadowCommit(fileChanges, commitMsg);
      setIsCommitting(false);

      if (result.success) {
        // Lifecycle 5: Commit done → testing done (all complete)
        advanceStage(messageId, "testing", "GitHub 커밋 + Vercel 배포 시작");
        addProgressEvent("commit-success", "GitHub 커밋 완료", "done");
        const files = parsed.codeBlocks.map((b) => b.targetFile);
        const filesStr = files.join(", ");

        // Commit report
        addSystemMessage(
          messageId,
          `📋 변경 리포트:\n• 수정 파일: ${filesStr}\n• 커밋: ${commitMsg}\n• 상태: ✅ GitHub 커밋 완료 → Vercel 빌드 시작`,
          "commit-report",
        );

        // Checkpoint card
        addSystemMessage(
          messageId,
          commitMsg,
          "checkpoint",
          { commitSha: result.sha, filesChanged: files },
        );

        // Stash deploy report data (shown after auto-test overlay completes)
        pendingDeployReportRef.current = {
          afterMessageId: messageId,
          data: {
            files,
            summary: parsed.explanation.slice(0, 200),
            commitMsg,
            liveUrl: livePreviewUrl ?? null,
            timestamp: now(),
          },
        };

        // Save code snapshot to long-term memory (fire-and-forget)
        try {
          const codeSnapshot = parsed.codeBlocks
            .map((b) => `--- ${b.targetFile} ---\n${b.code.slice(0, 1500)}`)
            .join("\n\n");
          fetch("/api/memory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "code",
              content: codeSnapshot,
              metadata: { files, commitMsg, sha: result.sha },
            }),
          }).catch(() => {});
        } catch {}
      } else {
        // Commit failed — mark testing stage as error
        setMessageStages((prev) => {
          const stages = prev[messageId];
          if (!stages) return prev;
          return {
            ...prev,
            [messageId]: stages.map((s) =>
              s.id === "testing" ? { ...s, status: "error" as const, detail: "커밋 실패 — 로컬 삽입만 완료" } : s
            ),
          };
        });
        addProgressEvent("commit-fail", "커밋 실패 — 로컬 삽입만 완료", "error");
        addSystemMessage(
          messageId,
          "코드가 에디터에 삽입되었습니다.",
          "normal",
        );
      }
    },
    [agentMode, onInsertCode, shadowCommit, addSystemMessage, addProgressEvent, advanceStage, livePreviewUrl],
  );

  // Ref for sendToAI to avoid circular dependency
  const sendToAIRef = useRef<((text: string) => Promise<void>) | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* ===== Agent mode: multi-agent pipeline ===== */
  const [agentSubtasks, setAgentSubtasks] = useState<{ id: string; description: string; status: string }[]>([]);
  const [agentStage, setAgentStage] = useState<string | null>(null);

  const agentAbortRef = useRef<AbortController | null>(null);

  const sendToAgent = useCallback(
    async (userText: string) => {
      setError(null);
      setIsStreaming(true);
      setAgentSubtasks([]);
      setAgentStage("planning");
      // Reset progress for this new run
      setProgressEvents([]);

      const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: userText };
      const assistantId = `ai-agent-${Date.now()}`;
      const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "" };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      initStages(assistantId);

      const fileContext: Record<string, string> = currentFiles
        ? Object.fromEntries(Object.entries(currentFiles).map(([, f]) => [f.name, f.content]))
        : {};

      // Abort controller with 120s safety timeout
      const ctrl = new AbortController();
      agentAbortRef.current = ctrl;
      const safetyTimer = setTimeout(() => ctrl.abort("Agent timeout (120s)"), 120000);

      try {
        const res = await fetch("/api/agent/run", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userText, fileContext }),
          signal: ctrl.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errData.error || `Agent API error: ${res.status}`);
        }
        if (!res.body) throw new Error("Empty response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let statusText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const evt = JSON.parse(payload);

              if (evt.type === "stage") {
                setAgentStage(evt.stage);
                const stageLabels: Record<string, string> = {
                  planning: "계획 수립 중...",
                  coding: "코드 생성 중...",
                  reviewing: "코드 리뷰 중...",
                  fixing: "수정 중...",
                  complete: "완료!",
                };
                const label = stageLabels[evt.stage] ?? evt.stage;
                statusText += `\n${label}`;
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: statusText } : m));

                if (evt.stage === "coding") advanceStage(assistantId, "planning", "계획 수립 완료");
                if (evt.stage === "reviewing") advanceStage(assistantId, "coding", "코드 생성 완료");
                if (evt.stage === "complete") completeAllStages(assistantId);
              }

              if (evt.type === "subtask") {
                setAgentSubtasks((prev) => {
                  const existing = prev.findIndex((s) => s.id === evt.id);
                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = { id: evt.id, description: evt.description, status: evt.status };
                    return updated;
                  }
                  return [...prev, { id: evt.id, description: evt.description, status: evt.status }];
                });
              }

              if (evt.type === "code" && evt.file && evt.content) {
                onInsertCode(
                  (evt.file.endsWith(".js") || evt.file.endsWith(".ts")) ? sanitizeJS(evt.content) : evt.content,
                  evt.file,
                  true,
                );
              }

              if (evt.type === "review" && evt.issues?.length > 0) {
                statusText += `\n리뷰 이슈: ${evt.issues.join(", ")}`;
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: statusText } : m));
              }

              if (evt.type === "complete" && Array.isArray(evt.files)) {
                const fileChanges = evt.files as { path: string; content: string }[];
                statusText += `\n${fileChanges.length}개 파일 완성 — 커밋 중...`;
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: statusText } : m));

                // Auto commit (with 15s timeout to prevent hang)
                if (onShadowCommit && fileChanges.length > 0) {
                  const commitMsg = `feat(agent): ${userText.slice(0, 50)}`;
                  try {
                    const ok = await Promise.race([
                      onShadowCommit(fileChanges, commitMsg),
                      new Promise<false>((r) => setTimeout(() => r(false), 15000)),
                    ]);
                    if (ok) {
                      statusText += "\nGitHub 커밋 완료!";
                    } else {
                      statusText += "\n커밋 실패 — 로컬 삽입만 완료";
                    }
                  } catch {
                    statusText += "\n커밋 오류 — 로컬 삽입만 완료";
                  }
                  setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: statusText } : m));
                }
              }

              if (evt.type === "error") {
                statusText += `\n오류: ${evt.message}`;
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: statusText } : m));
              }
            } catch { /* partial JSON */ }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + "\n⏱️ 시간 초과 — 파이프라인 중단됨" } : m));
          completeAllStages(assistantId);
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
        }
      } finally {
        clearTimeout(safetyTimer);
        agentAbortRef.current = null;
        setIsStreaming(false);
        setAgentStage(null);
        // Always clear progress — pipeline is done
        setProgressEvents([]);
      }
    },
    [currentFiles, onInsertCode, onShadowCommit, initStages, advanceStage, completeAllStages],
  );

  /* ===== Direct fetch streaming (no useChat) ===== */
  const sendToAI = useCallback(
    async (userText: string) => {
      // Strategy 5: Debouncing — block requests within 3 seconds
      const now2 = Date.now();
      if (now2 - lastSentAt < 3000) {
        console.log("[AIChatPanel] Debounced — too fast");
        return;
      }
      setLastSentAt(now2);

      console.log("[AIChatPanel] sendToAI called:", userText.slice(0, 50));
      setError(null);
      setIsStreaming(true);
      setProgressEvents([]);

      // Mode-specific instruction prefix
      let modePrefix = "";
      if (agentMode === "plan") {
        modePrefix = "[MODE: Plan] 코드 블록 없이 설계/구조/전략만 텍스트로 설명하세요.\n\n";
      } else if (agentMode === "edit") {
        modePrefix = "[MODE: Edit] 변경이 필요한 파일만 출력하세요. 변경 없는 파일은 생략.\n\n";
      }

      // Build file context map for server-side caching
      // Files are sent separately (not inside user message) for prompt caching
      const fileContext: Record<string, string> | undefined =
        currentFiles && Object.keys(currentFiles).length > 0
          ? Object.fromEntries(
              Object.entries(currentFiles).map(([, f]) => [f.name, f.content.slice(0, 1500)])
            )
          : undefined;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userText,
      };

      const assistantId = `ai-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      // Lifecycle 1: Init 4-stage card
      initStages(assistantId);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        // Build conversation history for API (plain format)
        const apiMessages = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: modePrefix + userText },
        ];

        console.log("[AIChatPanel] Fetching /api/chat, msgs:", apiMessages.length, fileContext ? `(+${Object.keys(fileContext).length} cached files)` : "");
        const res = await fetch("/api/chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, model: selectedModel, mode: agentMode, fileContext }),
          signal: abortController.signal,
        });

        console.log("[AIChatPanel] Response:", res.status, res.statusText);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          // Update daily usage from error response
          if (errData.dailyUsage) {
            setDailyUsage(errData.dailyUsage);
          }
          throw new Error(errData.error || `API error: ${res.status}`);
        }

        // Read cost strategy headers
        const dailyHeader = res.headers.get("X-Daily-Usage");
        if (dailyHeader) {
          const [c, l] = dailyHeader.split("/").map(Number);
          if (!isNaN(c) && !isNaN(l)) setDailyUsage({ count: c, limit: l });
        }

        if (!res.body) throw new Error("Empty response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let sseBuffer = "";
        let insertedBlocks = 0; // Track how many code blocks we've already live-inserted

        /** Convert tool call to IDE action and dispatch */
        const handleToolCall = (toolName: string, args: Record<string, unknown>) => {
          if (!onIDEAction) return;
          const actionMap: Record<string, () => IDEAction> = {
            switch_file: () => ({ type: "switch-file", file: String(args.file ?? "") }),
            create_file: () => ({ type: "create-file", name: String(args.name ?? "") }),
            delete_file: () => ({ type: "delete-file", name: String(args.name ?? "") }),
            set_viewport: () => ({ type: "set-viewport", size: args.size as "desktop" | "tablet" | "mobile" }),
            toggle_file_explorer: () => ({ type: "toggle-file-explorer" }),
            toggle_console: () => ({ type: "toggle-console" }),
            refresh_preview: () => ({ type: "refresh-preview" }),
            deploy: () => ({ type: "deploy" }),
            set_theme: () => ({ type: "set-theme", theme: args.theme as "dark" | "light" }),
            insert_code: () => ({ type: "insert-code", file: String(args.file ?? ""), content: String(args.content ?? "") }),
          };
          const factory = actionMap[toolName];
          if (factory) {
            onIDEAction(factory());
            addProgressEvent("file-insert", `IDE: ${toolName}(${JSON.stringify(args).slice(0, 50)})`, "done");
          }
        };

        /** Parse a single SSE data line and accumulate text */
        const processLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) return;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") return;
          const obj = JSON.parse(payload);
          if (obj.type === "text-delta" && typeof obj.delta === "string") {
            fullText += obj.delta;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: fullText } : m,
              ),
            );
            // Live preview: when a new code block closes (```), insert it immediately
            // Skip live insertion in plan mode
            if (agentMode !== "plan" && agentMode !== "agent") {
              const parsed = parseAIResponse(fullText);
              if (parsed.codeBlocks.length > insertedBlocks) {
                // Lifecycle 2: First code block → advance planning→done, coding→active
                if (insertedBlocks === 0) {
                  advanceStage(assistantId, "planning", "AI가 요청을 분석했습니다");
                }
                for (let i = insertedBlocks; i < parsed.codeBlocks.length; i++) {
                  const block = parsed.codeBlocks[i];
                  const code = (block.targetFile.endsWith(".js") || block.targetFile.endsWith(".ts"))
                    ? sanitizeJS(block.code)
                    : block.code;
                  onInsertCode(code, block.targetFile, true);
                }
                insertedBlocks = parsed.codeBlocks.length;
              }
            }
          }
          // Handle tool calls from AI SDK streaming
          if (obj.type === "tool-call" && obj.toolName && obj.args) {
            handleToolCall(obj.toolName, obj.args);
          }
          if (obj.type === "error") {
            throw new Error(obj.errorText || obj.message || "API stream error");
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });

          // Split into complete lines; keep last (potentially partial) line in buffer
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            try {
              processLine(line);
            } catch (e) {
              if (e instanceof SyntaxError) continue; // partial JSON, skip
              throw e;
            }
          }
        }

        // Flush remaining buffer (decoder may hold trailing bytes)
        sseBuffer += decoder.decode();
        if (sseBuffer.trim()) {
          for (const line of sseBuffer.split("\n")) {
            try {
              processLine(line);
            } catch { /* trailing partial — safe to skip */ }
          }
        }

        console.log("[AIChatPanel] Stream done. Text length:", fullText.length);
        setIsStreaming(false);
        addProgressEvent("stream-end", "AI 응답 완료", "done");

        // Lifecycle 3: Stream complete → coding done, applying active
        if (agentMode === "plan" || insertedBlocks === 0) {
          // Plan mode or no code blocks: complete all stages
          completeAllStages(assistantId);
        } else {
          advanceStage(assistantId, "coding", `${insertedBlocks}개 코드 블록 작성 완료`);
        }

        // Process completed response
        if (fullText) {
          await handleAIResponseComplete(assistantId, fullText);

          // Auto-save conversation to long-term memory (fire-and-forget)
          try {
            fetch("/api/memory", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "conversation",
                content: `User: ${userText}\n\nAI: ${fullText.slice(0, 3000)}`,
                metadata: { mode: agentMode, model: selectedModel },
              }),
            }).catch(() => {});
          } catch {}
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[AIChatPanel] Error:", msg);
        setError(msg);
        addProgressEvent("stream-end", `오류: ${msg}`, "error");
        // Mark current active stage as error
        setMessageStages((prev) => {
          const stages = prev[assistantId];
          if (!stages) return prev;
          return {
            ...prev,
            [assistantId]: stages.map((s) =>
              s.status === "active" ? { ...s, status: "error" as const, detail: msg } : s
            ),
          };
        });
        // Remove empty assistant message on error
        setMessages((prev) => prev.filter((m) => !(m.id === assistantId && !m.content)));
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        // Always clear progress — stream is done
        setProgressEvents([]);
      }
    },
    [messages, currentFiles, handleAIResponseComplete, selectedModel, agentMode, addProgressEvent, initStages, advanceStage, completeAllStages, lastSentAt],
  );

  // Keep sendToAI ref updated for auto-fix callback
  useEffect(() => { sendToAIRef.current = sendToAI; }, [sendToAI]);

  // Auto-send initial prompt when transitioning from dashboard
  useEffect(() => {
    if (!initialPrompt || initialPromptSentRef.current) return;
    initialPromptSentRef.current = true;
    sendToAI(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const doSend = useCallback(() => {
    console.log("[AIChatPanel] doSend. input:", inputValue, "streaming:", isStreaming, "committing:", isCommitting);
    if (!inputValue.trim() || isStreaming || isCommitting) return;
    const text = inputValue.trim();
    setInputValue("");

    const sendFn = agentMode === "agent" ? sendToAgent : sendToAI;
    sendFn(text).catch((err: unknown) => {
      console.error("[AIChatPanel] Unhandled error:", err);
      setError(err instanceof Error ? err.message : String(err));
      setIsStreaming(false);
    });
  }, [inputValue, isStreaming, isCommitting, sendToAI, sendToAgent, agentMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  }, [doSend]);

  const renderMessageContent = (content: string, messageId: string) => {
    const parsed = parseAIResponse(content);
    const stages = messageStages[messageId];
    const showCard = stages && stages.length > 0 && (
      isStreaming || stages.some((s) => s.status !== "done") || stages.every((s) => s.status === "done")
    );
    return (
      <>
        {showCard && (
          <TaskProgressCard stages={stages} />
        )}
        {parsed.explanation && (
          <div className="whitespace-pre-wrap">{parsed.explanation}</div>
        )}
        {/* Auto-insert summary badge */}
        {parsed.codeBlocks.length > 0 && parsed.codeBlocks.every((_, idx) => autoInsertedBlocks.has(`${messageId}-code-${idx}`)) && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#00B894] bg-[#00B894]/8 px-2.5 py-1.5 rounded-lg">
            <Check size={11} />
            <span>{parsed.codeBlocks.length}개 파일 자동 삽입 완료</span>
          </div>
        )}
        {parsed.codeBlocks.map((block, idx) => {
          const blockId = `${messageId}-code-${idx}`;
          const isInserted = autoInsertedBlocks.has(blockId);
          const isExpanded = expandedBlocks.has(blockId);
          return (
            <div key={blockId} className={`mt-2 rounded-lg overflow-hidden border ${isInserted ? "border-[#00B894]/30" : "border-[var(--r-border)]"}`}>
              <div className="flex items-center justify-between px-2 py-1 bg-[#1E1E1E]">
                <span className="text-[10px] text-[#858585] font-mono flex items-center gap-1">
                  <FileText size={9} />
                  {block.targetFile}
                </span>
                <div className="flex items-center gap-1">
                  {isInserted ? (
                    <>
                      <span className="flex items-center gap-1 text-[10px] text-[#00B894] px-1 py-0.5">
                        <Check size={9} />
                        삽입됨
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(block.code, blockId)}
                        className="text-[#858585] hover:text-white p-0.5 transition-colors"
                        aria-label="Copy code"
                      >
                        {copiedId === blockId ? <Check size={11} className="text-[#00B894]" /> : <Copy size={11} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleBlockExpand(blockId)}
                        className="text-[#858585] hover:text-white p-0.5 transition-colors"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopy(block.code, blockId)}
                        className="text-[#858585] hover:text-white p-0.5 transition-colors"
                        aria-label="Copy code"
                      >
                        {copiedId === blockId ? <Check size={11} className="text-[#00B894]" /> : <Copy size={11} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const code = (block.targetFile.endsWith(".js") || block.targetFile.endsWith(".ts"))
                            ? sanitizeJS(block.code)
                            : block.code;
                          onInsertCode(code, block.targetFile);
                        }}
                        className="flex items-center gap-1 text-[10px] bg-[#0079F2] text-white px-1.5 py-0.5 rounded hover:bg-[#0066CC] transition-colors"
                      >
                        <Code2 size={9} />
                        삽입
                      </button>
                    </>
                  )}
                </div>
              </div>
              {(!isInserted || isExpanded) && (
                <pre className="px-2 py-2 bg-[#0d1117] text-[11px] text-[#e6edf3] overflow-x-auto max-h-[200px] overflow-y-auto leading-5">
                  {block.code}
                </pre>
              )}
            </div>
          );
        })}
      </>
    );
  };

  const getSystemMessagesAfter = (messageId: string) =>
    systemMessages.filter((sm) => sm.afterMessageId === messageId);

  const modePlaceholders: Record<AgentMode, string> = {
    build: "기능을 지시하세요... (예: 빨간 버튼 만들어줘)",
    plan: "설계를 요청하세요... (예: 로그인 기능 구조 설명해줘)",
    edit: "수정할 부분을 지시하세요... (예: 헤더 색상 바꿔줘)",
    agent: "자율 에이전트에게 지시... (예: todo 앱 만들어줘)",
  };

  return (
    <div className="flex flex-col h-full bg-[var(--r-surface)] border-r border-[var(--r-border)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--r-bg)] border-b border-[var(--r-border)] shrink-0">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#0079F2] to-[#00c2ff] flex items-center justify-center">
          <Sparkles size={10} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-[var(--r-text)]">Agent</span>
        {/* Model selector */}
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setShowModelMenu((v) => !v)}
            className="text-[10px] text-[var(--r-text-secondary)] bg-[var(--r-surface-hover)] px-1.5 py-0.5 rounded-md hover:text-[var(--r-text)] transition-colors"
          >
            {AI_MODELS.find((m) => m.id === selectedModel)?.label ?? selectedModel}
          </button>
          {showModelMenu && (
            <div className="absolute top-full left-0 mt-1 bg-[var(--r-surface)] border border-[var(--r-border)] rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
              {AI_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setSelectedModel(m.id); setShowModelMenu(false); }}
                  className={`w-full text-left px-3 py-1 text-[11px] transition-colors flex items-center justify-between ${
                    selectedModel === m.id
                      ? "bg-[#0079F2]/10 text-[#0079F2]"
                      : "text-[var(--r-text-secondary)] hover:bg-[var(--r-surface-hover)]"
                  }`}
                >
                  <span>{m.label}</span>
                  <span className="text-[9px] opacity-60">{m.cost}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {isCommitting && (
          <span className="flex items-center gap-1 text-[10px] text-[#F59E0B] ml-auto">
            <Loader2 size={10} className="animate-spin" /> Committing...
          </span>
        )}
        {isStreaming && !isCommitting && (
          <span className="flex items-center gap-1 text-[10px] text-[#0079F2] ml-auto">
            <Loader2 size={10} className="animate-spin" /> Streaming...
          </span>
        )}
        {!isCommitting && !isStreaming && (
          <span className="text-[10px] bg-[#00B894]/10 text-[#00B894] px-1.5 py-0.5 rounded-full ml-auto font-medium">
            Ready
          </span>
        )}
        {messages.length > 0 && !isStreaming && (
          <button
            type="button"
            onClick={() => { setMessages([]); setSystemMessages([]); setProgressEvents([]); setMessageStages({}); try { localStorage.removeItem(chatStorageKey); } catch {} }}
            className="text-[var(--r-text-muted)] hover:text-[var(--r-text-secondary)] p-1 transition-colors"
            title="대화 내역 삭제"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>

      {/* Agent Mode Tabs */}
      <div className="flex items-center border-b border-[var(--r-border)] bg-[var(--r-bg)] shrink-0">
        {AGENT_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = agentMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setAgentMode(mode.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-colors relative ${
                isActive ? "text-[#0079F2]" : "text-[var(--r-text-secondary)] hover:text-[var(--r-text)]"
              }`}
              title={mode.desc}
            >
              <Icon size={12} />
              {mode.label}
              {isActive && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#0079F2] rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 bg-[var(--r-surface)]">
        {/* Static welcome message */}
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0079F2] to-[#00c2ff] flex items-center justify-center shrink-0 mt-0.5">
            <Bot size={12} className="text-white" />
          </div>
          <div className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed bg-[#F5F5F3] text-[var(--r-text)] rounded-bl-sm">
            <div className="whitespace-pre-wrap">{WELCOME_TEXT}</div>
          </div>
        </div>

        {/* Agent subtask progress */}
        {agentMode === "agent" && agentSubtasks.length > 0 && (
          <div className="mx-2 px-3 py-2 rounded-xl bg-[var(--r-bg)] border border-[var(--r-border)]">
            <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-[#0079F2]">
              <Cpu size={12} />
              Agent Pipeline {agentStage && <span className="font-normal text-[var(--r-text-secondary)]">— {agentStage}</span>}
            </div>
            <div className="space-y-1">
              {agentSubtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 text-[10px]">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    st.status === "done" ? "bg-[#00B894]" :
                    st.status === "active" ? "bg-[#0079F2] animate-pulse" :
                    "bg-[var(--r-border)]"
                  }`} />
                  <span className={
                    st.status === "done" ? "text-[#00B894]" :
                    st.status === "active" ? "text-[#0079F2]" :
                    "text-[var(--r-text-muted)]"
                  }>{st.description}</span>
                  <span className="text-[9px] text-[var(--r-text-muted)] ml-auto">{st.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API connectivity status */}
        {apiStatus === "error" && (
          <div className="mx-2 px-3 py-1.5 rounded-lg text-[10px] bg-red-50 text-red-600 border border-red-200">
            API 연결 실패 — 쿠키/인증 문제일 수 있습니다
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            <div className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0079F2] to-[#00c2ff] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={12} className="text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#0079F2] text-white rounded-br-sm"
                    : "bg-[#F5F5F3] text-[var(--r-text)] rounded-bl-sm"
                }`}
              >
                {msg.role === "assistant"
                  ? renderMessageContent(msg.content, msg.id)
                  : <div className="whitespace-pre-wrap">{msg.content}</div>
                }
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-[#E4E4E0] flex items-center justify-center shrink-0 mt-0.5">
                  <User size={12} className="text-[var(--r-text-secondary)]" />
                </div>
              )}
            </div>

            {getSystemMessagesAfter(msg.id).map((sm) => (
              <div key={sm.id}>
                {sm.type === "deploy-report" && sm.deployReportData ? (
                  /* ===== Deploy Report Card ===== */
                  <DeployReportCard data={sm.deployReportData} />
                ) : sm.type === "checkpoint" ? (
                  /* ===== Checkpoint Card ===== */
                  <div className="mx-2 mt-2 px-3 py-2 rounded-xl bg-[#EEF2FF] border border-[#0079F2]/20 text-[11px]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#0079F2]" />
                      <span className="font-semibold text-[#0079F2]">Checkpoint</span>
                      {sm.commitSha && (
                        <span className="font-mono text-[10px] text-[var(--r-text-secondary)]">
                          {sm.commitSha.slice(0, 7)}
                        </span>
                      )}
                    </div>
                    {sm.filesChanged && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {sm.filesChanged.map((f) => (
                          <span key={f} className="px-1.5 py-0.5 bg-[#0079F2]/10 text-[#0079F2] rounded text-[9px] font-mono">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--r-text-secondary)]">{sm.content}</span>
                      {sm.commitSha && onGitRestore && (
                        <button
                          type="button"
                          onClick={() => onGitRestore(sm.commitSha!)}
                          className="flex items-center gap-1 text-[10px] text-[#F59E0B] hover:text-[#D97706] transition-colors"
                        >
                          <RotateCcw size={10} />
                          Rollback
                        </button>
                      )}
                    </div>
                    <div className="text-[9px] text-[var(--r-text-muted)] mt-1 text-right">{sm.timestamp}</div>
                  </div>
                ) : (
                  /* ===== Normal / Commit Report ===== */
                  <div
                    className={`mx-2 mt-2 px-3 py-2 rounded-xl text-[11px] leading-relaxed whitespace-pre-wrap ${
                      sm.type === "commit-report"
                        ? "bg-[#E6FAF5] border border-[#00B894]/20 text-[#065F46]"
                        : "bg-[#F5F5F3] border border-[var(--r-border)] text-[var(--r-text-secondary)]"
                    }`}
                  >
                    {sm.type === "commit-report" && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <GitCommit size={11} className="text-[#00B894]" />
                        <span className="font-semibold text-[#00B894]">Shadow Commit</span>
                      </div>
                    )}
                    {sm.content}
                    <div className="text-[9px] text-[var(--r-text-muted)] mt-1 text-right">{sm.timestamp}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Streaming indicator — TaskProgressCard replaces 3-dot bounce */}
        {isStreaming && messages.length > 0 && !messages[messages.length - 1]?.content && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0079F2] to-[#00c2ff] flex items-center justify-center shrink-0 mt-0.5">
              <Bot size={12} className="text-white" />
            </div>
            <div className="flex-1 max-w-[85%]">
              <TaskProgressCard
                stages={messageStages[messages[messages.length - 1]?.id] ?? []}
              />
            </div>
          </div>
        )}

        {isCommitting && (
          <div className="flex items-center gap-2 mx-2 px-3 py-2 bg-[var(--r-accent-light)] rounded-xl border border-[#0079F2]/15">
            <Loader2 size={12} className="animate-spin text-[#0079F2]" />
            <span className="text-[11px] text-[#0079F2]">GitHub에 커밋 중... Vercel 자동 빌드 트리거</span>
          </div>
        )}

        {error && (
          <div className="mx-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-700 leading-relaxed">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle size={12} className="text-red-500" />
              <span className="font-semibold">오류 발생</span>
            </div>
            <div className="whitespace-pre-wrap">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="mt-2 flex items-center gap-1 text-[10px] bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-lg transition-colors"
            >
              <RefreshCw size={10} />
              닫기
            </button>
          </div>
        )}

        {/* Virtual Error Detector Notification */}
        {errorFixState && (
          <div className="mx-2 mb-1">
            <style>{`
              @keyframes fn-error-slide-in {
                from { opacity: 0; transform: translateY(6px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes fn-fix-pulse {
                0%, 100% { border-color: rgba(245, 158, 11, 0.3); }
                50% { border-color: rgba(245, 158, 11, 0.6); }
              }
              @keyframes fn-fix-progress {
                from { width: 0%; }
                to { width: 100%; }
              }
              @keyframes fn-fix-done {
                0% { transform: scale(0.95); opacity: 0.8; }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); opacity: 1; }
              }
            `}</style>
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: errorFixState.phase === "done"
                  ? "linear-gradient(135deg, #0D1117, #0A1A10)"
                  : "linear-gradient(135deg, #0D1117, #1A1207)",
                border: errorFixState.phase === "done"
                  ? "1px solid rgba(0, 255, 136, 0.25)"
                  : "1px solid rgba(245, 158, 11, 0.25)",
                animation: errorFixState.phase === "done"
                  ? "fn-fix-done 0.3s ease-out"
                  : errorFixState.phase === "fixing"
                  ? "fn-fix-pulse 1.5s ease-in-out infinite"
                  : "fn-error-slide-in 0.3s ease-out",
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 px-3 py-2">
                {errorFixState.phase === "done" ? (
                  <ShieldCheck size={14} style={{ color: "#00FF88" }} />
                ) : (
                  <ShieldAlert size={14} style={{ color: "#F59E0B" }} />
                )}
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: errorFixState.phase === "done" ? "#00FF88" : "#F59E0B" }}
                >
                  {errorFixState.phase === "done" ? "✅ 수정 완료" : "⚠️ 오류 감지됨"}
                </span>
                <span className="text-[9px] ml-auto" style={{ color: "#484F58" }}>
                  Virtual Error Detector
                </span>
              </div>

              {/* Error message */}
              <div
                className="mx-3 mb-2 px-2.5 py-1.5 rounded-lg text-[10px] font-mono leading-relaxed truncate"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "#8B949E",
                }}
              >
                {errorFixState.message}
              </div>

              {/* Status */}
              <div className="px-3 pb-2.5">
                {errorFixState.phase === "detecting" && (
                  <div className="flex items-center gap-2">
                    <Loader2 size={11} className="animate-spin" style={{ color: "#F59E0B" }} />
                    <span className="text-[10px]" style={{ color: "#F59E0B" }}>
                      오류 분석 중...
                    </span>
                  </div>
                )}
                {errorFixState.phase === "fixing" && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Wrench size={11} style={{ color: "#00D4FF" }} />
                      <span className="text-[10px]" style={{ color: "#00D4FF" }}>
                        자동 수정 중...
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: "linear-gradient(90deg, #00D4FF, #00FF88)",
                          animation: "fn-fix-progress 2s ease-in-out forwards",
                        }}
                      />
                    </div>
                  </div>
                )}
                {errorFixState.phase === "done" && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={11} style={{ color: "#00FF88" }} />
                    <span className="text-[10px]" style={{ color: "#00FF88" }}>
                      수정 완료 — 프리뷰 새로고침됨
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Progress Panel — only visible while streaming */}
      {isStreaming && (
        <div className="border-t border-[var(--r-border)] bg-[var(--r-bg)] shrink-0 px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[10px] text-[#0079F2]">
            <Activity size={11} className="animate-pulse" />
            처리 중...
          </span>
        </div>
      )}

      {/* Input — no <form>, direct onClick + Enter key */}
      <div className="px-3 py-2.5 border-t border-[var(--r-border)] bg-[var(--r-bg)] shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={modePlaceholders[agentMode]}
            className="flex-1 bg-[var(--r-surface)] text-[var(--r-text)] text-xs px-3 py-2 rounded-xl border border-[var(--r-border)] focus:border-[#0079F2] focus:ring-1 focus:ring-[#0079F2]/20 outline-none placeholder-[#9DA5B0] transition-all"
            disabled={isStreaming || isCommitting}
          />
          <button
            type="button"
            onClick={doSend}
            disabled={!inputValue.trim() || isStreaming || isCommitting}
            className="p-2 bg-[#0079F2] text-white rounded-xl hover:bg-[#0066CC] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Send message"
          >
            <Send size={12} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <div className="text-[9px] text-[var(--r-text-muted)]">
            Field Nine AI — {agentMode === "plan" ? "Plan" : agentMode === "edit" ? "Edit" : "Build"} — v3.2
          </div>
          <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
            dailyUsage.count > dailyUsage.limit * 0.9
              ? "bg-red-100 text-red-600"
              : dailyUsage.count > dailyUsage.limit * 0.5
                ? "bg-amber-50 text-amber-600"
                : "text-[var(--r-text-muted)]"
          }`}>
            {dailyUsage.count}/{dailyUsage.limit}
          </div>
        </div>
      </div>
    </div>
  );
}
