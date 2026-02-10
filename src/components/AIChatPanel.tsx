/* eslint-disable react-hooks/preserve-manual-memoization */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { parseAIResponse } from "@/lib/parseAIResponse";
import { validateJS, sanitizeJS } from "@/lib/codeValidator";
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
} from "lucide-react";

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
  type: "commit-report" | "error" | "normal" | "checkpoint";
  timestamp: string;
  commitSha?: string;
  filesChanged?: string[];
}

interface CurrentFile {
  name: string;
  content: string;
}

/* ===== Agent Mode ===== */
type AgentMode = "build" | "plan" | "edit";

const AGENT_MODES: { id: AgentMode; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "build", label: "Build", icon: Hammer, desc: "코드 생성 + 자동 배포" },
  { id: "plan", label: "Plan", icon: Lightbulb, desc: "설계만, 코드 없음" },
  { id: "edit", label: "Edit", icon: Pencil, desc: "변경 파일만 출력" },
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
}

function now() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

const WELCOME_TEXT =
  "무엇을 만들까요? 기능을 지시하면 코드 생성 → 자동 배포합니다.";

const AI_MODELS = [
  { id: "claude-sonnet", label: "Claude Sonnet" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini" },
] as const;

type AIModelId = (typeof AI_MODELS)[number]["id"];

export default function AIChatPanel({ onInsertCode, currentFiles, onShadowCommit, initialPrompt, onGitRestore, externalMessage, onExternalMessageConsumed }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [apiStatus, setApiStatus] = useState<"ok" | "error">("ok");
  const [selectedModel, setSelectedModel] = useState<AIModelId>("claude-sonnet");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initialPromptSentRef = useRef(false);
  const autoFixRetryRef = useRef(0); // max 1 auto-fix retry per AI response

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

      // If JS has errors and we haven't retried yet, auto-fix
      if (validationErrors.length > 0 && autoFixRetryRef.current < 1) {
        autoFixRetryRef.current += 1;
        addProgressEvent("file-insert", `코드 검증 실패 — 자동 수정 요청 (${autoFixRetryRef.current}/1)`, "pending");

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

      // Reset retry counter on successful validation
      autoFixRetryRef.current = 0;

      for (const block of parsed.codeBlocks) {
        onInsertCode(block.code, block.targetFile, true);
        addProgressEvent("file-insert", `${block.targetFile} 자동 삽입`, "done");
      }

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
      } else {
        addProgressEvent("commit-fail", "커밋 실패 — 로컬 삽입만 완료", "error");
        addSystemMessage(
          messageId,
          "코드가 에디터에 삽입되었습니다.",
          "normal",
        );
      }
    },
    [agentMode, onInsertCode, shadowCommit, addSystemMessage, addProgressEvent],
  );

  // Ref for sendToAI to avoid circular dependency
  const sendToAIRef = useRef<((text: string) => Promise<void>) | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* ===== Direct fetch streaming (no useChat) ===== */
  const sendToAI = useCallback(
    async (userText: string) => {
      console.log("[AIChatPanel] sendToAI called:", userText.slice(0, 50));
      setError(null);
      setIsStreaming(true);
      addProgressEvent("stream-start", "AI 응답 스트리밍 시작", "pending");

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
          throw new Error(errData.error || `API error: ${res.status}`);
        }

        if (!res.body) throw new Error("Empty response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let sseBuffer = "";
        let insertedBlocks = 0; // Track how many code blocks we've already live-inserted

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
            if (agentMode !== "plan") {
              const parsed = parseAIResponse(fullText);
              if (parsed.codeBlocks.length > insertedBlocks) {
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

        // Process completed response
        if (fullText) {
          await handleAIResponseComplete(assistantId, fullText);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[AIChatPanel] Error:", msg);
        setError(msg);
        addProgressEvent("stream-end", `오류: ${msg}`, "error");
        // Remove empty assistant message on error
        setMessages((prev) => prev.filter((m) => !(m.id === assistantId && !m.content)));
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, currentFiles, handleAIResponseComplete, selectedModel, agentMode, addProgressEvent],
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
    sendToAI(text).catch((err: unknown) => {
      console.error("[AIChatPanel] Unhandled error:", err);
      setError(err instanceof Error ? err.message : String(err));
      setIsStreaming(false);
    });
  }, [inputValue, isStreaming, isCommitting, sendToAI]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  }, [doSend]);

  const renderMessageContent = (content: string, messageId: string) => {
    const parsed = parseAIResponse(content);
    return (
      <>
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
                  className={`w-full text-left px-3 py-1 text-[11px] transition-colors ${
                    selectedModel === m.id
                      ? "bg-[#0079F2]/10 text-[#0079F2]"
                      : "text-[var(--r-text-secondary)] hover:bg-[var(--r-surface-hover)]"
                  }`}
                >
                  {m.label}
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
            onClick={() => { setMessages([]); setSystemMessages([]); setProgressEvents([]); try { localStorage.removeItem(chatStorageKey); } catch {} }}
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
                {sm.type === "checkpoint" ? (
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

        {/* Streaming indicator */}
        {isStreaming && messages.length > 0 && !messages[messages.length - 1]?.content && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0079F2] to-[#00c2ff] flex items-center justify-center shrink-0">
              <Bot size={12} className="text-white" />
            </div>
            <div className="bg-[#F5F5F3] rounded-xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#9DA5B0] animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#9DA5B0] animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#9DA5B0] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
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

        <div ref={messagesEndRef} />
      </div>

      {/* Progress Panel (collapsible) */}
      {progressEvents.length > 0 && (
        <div className="border-t border-[var(--r-border)] bg-[var(--r-bg)] shrink-0">
          <button
            type="button"
            onClick={() => setShowProgress((v) => !v)}
            className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] text-[var(--r-text-secondary)] hover:text-[var(--r-text)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Activity size={11} />
              Progress ({progressEvents.filter((e) => e.status === "pending").length} active)
            </span>
            {showProgress ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          </button>
          {showProgress && (
            <div className="max-h-[120px] overflow-y-auto px-3 pb-2 space-y-1">
              {[...progressEvents].reverse().map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 text-[10px]">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    ev.status === "done" ? "bg-[#00B894]" :
                    ev.status === "pending" ? "bg-[#F59E0B] animate-pulse" :
                    "bg-[#EF4444]"
                  }`} />
                  <span className="text-[var(--r-text-secondary)] truncate flex-1">{ev.message}</span>
                  <span className="text-[var(--r-text-muted)] shrink-0">{ev.timestamp}</span>
                </div>
              ))}
            </div>
          )}
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
        <div className="text-[9px] text-[var(--r-text-muted)] mt-1.5 text-center">
          Field Nine AI — {agentMode === "plan" ? "Plan Mode" : agentMode === "edit" ? "Edit Mode" : "Build Mode"} — Shadow Commit Engine v3.1
        </div>
      </div>
    </div>
  );
}
