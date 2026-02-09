/* eslint-disable react-hooks/preserve-manual-memoization */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { parseAIResponse } from "@/lib/parseAIResponse";
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
  type: "commit-report" | "error" | "normal";
  timestamp: string;
}

interface CurrentFile {
  name: string;
  content: string;
}

interface AIChatPanelProps {
  onInsertCode: (code: string, fileName: string) => void;
  activeFile: string;
  currentFiles?: Record<string, CurrentFile>;
  onShadowCommit?: (files: FileChange[], message: string) => Promise<boolean>;
  onDeployStatusChanged?: (status: string) => void;
}

function now() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

const WELCOME_TEXT =
  "안녕하세요, 보스! Field Nine AI입니다.\n\n기능을 지시하시면 코드를 생성하고 서버에 자동 반영합니다.\n\n예시: \"빨간 버튼 만들어줘\", \"히어로 섹션 추가해줘\", \"다크모드 토글\"";

export default function AIChatPanel({ onInsertCode, currentFiles, onShadowCommit }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">("checking");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, systemMessages, isStreaming, isCommitting]);

  // Mount-time API connectivity test — result shown in UI
  useEffect(() => {
    console.log("[AIChatPanel] Mounted. Testing API...");
    fetch("/api/chat", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "ping" }] }),
    })
      .then((res) => {
        console.log("[AIChatPanel] API test:", res.status, res.headers.get("content-type"));
        setApiStatus(res.ok ? "ok" : "error");
        if (!res.ok) setError(`API 연결 실패: HTTP ${res.status}`);
        res.body?.cancel();
      })
      .catch((err) => {
        console.error("[AIChatPanel] API test FAILED:", err);
        setApiStatus("error");
        setError(`API 연결 실패: ${err instanceof Error ? err.message : String(err)}`);
      });
  }, []);

  const shadowCommit = useCallback(
    async (fileChanges: FileChange[], commitMsg: string): Promise<boolean> => {
      if (onShadowCommit) {
        return onShadowCommit(fileChanges, commitMsg);
      }
      try {
        const res = await fetch("/api/save-code", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: fileChanges, message: commitMsg }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data.success === true;
      } catch {
        return false;
      }
    },
    [onShadowCommit],
  );

  const addSystemMessage = useCallback(
    (afterMessageId: string, content: string, type: SystemMessage["type"]) => {
      setSystemMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          afterMessageId,
          content,
          type,
          timestamp: now(),
        },
      ]);
    },
    [],
  );

  const handleAIResponseComplete = useCallback(
    async (messageId: string, content: string) => {
      const parsed = parseAIResponse(content);
      if (parsed.codeBlocks.length === 0) return;

      for (const block of parsed.codeBlocks) {
        onInsertCode(block.code, block.targetFile);
      }

      setIsCommitting(true);
      const fileChanges = parsed.codeBlocks.map((b) => ({
        path: b.targetFile,
        content: b.code,
      }));
      const commitMsg = `feat(ai): ${parsed.explanation.slice(0, 50)}`;
      const success = await shadowCommit(fileChanges, commitMsg);
      setIsCommitting(false);

      if (success) {
        const files = parsed.codeBlocks.map((b) => b.targetFile).join(", ");
        addSystemMessage(
          messageId,
          `📋 변경 리포트:\n• 수정 파일: ${files}\n• 커밋: ${commitMsg}\n• 상태: ✅ GitHub 커밋 완료 → Vercel 빌드 시작`,
          "commit-report",
        );
      } else {
        addSystemMessage(
          messageId,
          "코드가 에디터에 삽입되었습니다.",
          "normal",
        );
      }
    },
    [onInsertCode, shadowCommit, addSystemMessage],
  );

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

      // Build context with current files
      let contextPrefix = "";
      if (currentFiles && Object.keys(currentFiles).length > 0) {
        const snippets = Object.entries(currentFiles)
          .map(([, f]) => `--- ${f.name} ---\n${f.content.slice(0, 2000)}`)
          .join("\n\n");
        contextPrefix = `[현재 프로젝트 코드]\n${snippets}\n\n[사용자 요청]\n`;
      }

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
          { role: "user" as const, content: contextPrefix + userText },
        ];

        console.log("[AIChatPanel] Fetching /api/chat, msgs:", apiMessages.length);
        const res = await fetch("/api/chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
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
        let sseBuffer = ""; // Buffer for partial SSE lines across chunks

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });

          // Split into complete lines; keep last (potentially partial) line in buffer
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const obj = JSON.parse(payload);
              if (obj.type === "text-delta" && typeof obj.delta === "string") {
                fullText += obj.delta;
                // Update assistant message in real-time
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullText } : m,
                  ),
                );
              }
              if (obj.type === "error") {
                throw new Error(obj.errorText || obj.message || "API stream error");
              }
            } catch (e) {
              // Re-throw API errors; skip JSON parse errors (partial lines)
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }

        // Flush any remaining buffered data
        if (sseBuffer.trim().startsWith("data:")) {
          const payload = sseBuffer.trim().slice(5).trim();
          if (payload && payload !== "[DONE]") {
            try {
              const obj = JSON.parse(payload);
              if (obj.type === "text-delta" && typeof obj.delta === "string") {
                fullText += obj.delta;
              }
            } catch { /* skip trailing partial */ }
          }
        }

        console.log("[AIChatPanel] Stream done. Text length:", fullText.length);
        setIsStreaming(false);

        // Process completed response
        if (fullText) {
          await handleAIResponseComplete(assistantId, fullText);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[AIChatPanel] Error:", msg);
        setError(msg);
        // Remove empty assistant message on error
        setMessages((prev) => prev.filter((m) => !(m.id === assistantId && !m.content)));
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, currentFiles, handleAIResponseComplete],
  );

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
        {parsed.codeBlocks.map((block, idx) => {
          const blockId = `${messageId}-code-${idx}`;
          return (
            <div key={blockId} className="mt-2 rounded-lg overflow-hidden border border-[#E4E4E0]">
              <div className="flex items-center justify-between px-2 py-1 bg-[#1E1E1E]">
                <span className="text-[10px] text-[#858585] font-mono flex items-center gap-1">
                  <FileText size={9} />
                  {block.targetFile}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(block.code, blockId)}
                    className="text-[#858585] hover:text-white p-0.5 transition-colors"
                    aria-label="Copy code"
                  >
                    {copiedId === blockId ? (
                      <Check size={11} className="text-[#00B894]" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onInsertCode(block.code, block.targetFile)}
                    className="flex items-center gap-1 text-[10px] bg-[#0079F2] text-white px-1.5 py-0.5 rounded hover:bg-[#0066CC] transition-colors"
                  >
                    <Code2 size={9} />
                    삽입
                  </button>
                </div>
              </div>
              <pre className="px-2 py-2 bg-[#0d1117] text-[11px] text-[#e6edf3] overflow-x-auto max-h-[200px] overflow-y-auto leading-5">
                {block.code}
              </pre>
            </div>
          );
        })}
      </>
    );
  };

  const getSystemMessagesAfter = (messageId: string) =>
    systemMessages.filter((sm) => sm.afterMessageId === messageId);

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#E4E4E0]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F9F9F7] border-b border-[#E4E4E0] shrink-0">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#0079F2] to-[#00c2ff] flex items-center justify-center">
          <Sparkles size={10} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-[#1D2433]">AI Assistant</span>
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
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 bg-white">
        {/* Static welcome message */}
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0079F2] to-[#00c2ff] flex items-center justify-center shrink-0 mt-0.5">
            <Bot size={12} className="text-white" />
          </div>
          <div className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed bg-[#F5F5F3] text-[#1D2433] rounded-bl-sm">
            <div className="whitespace-pre-wrap">{WELCOME_TEXT}</div>
          </div>
        </div>

        {/* API connectivity status */}
        {apiStatus !== "ok" && (
          <div className={`mx-2 px-3 py-1.5 rounded-lg text-[10px] ${
            apiStatus === "checking"
              ? "bg-[#FFF8E1] text-[#F59E0B] border border-[#F59E0B]/20"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}>
            {apiStatus === "checking" ? "API 연결 확인 중..." : "API 연결 실패 — 쿠키/인증 문제일 수 있습니다"}
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
                    : "bg-[#F5F5F3] text-[#1D2433] rounded-bl-sm"
                }`}
              >
                {msg.role === "assistant"
                  ? renderMessageContent(msg.content, msg.id)
                  : <div className="whitespace-pre-wrap">{msg.content}</div>
                }
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-[#E4E4E0] flex items-center justify-center shrink-0 mt-0.5">
                  <User size={12} className="text-[#5F6B7A]" />
                </div>
              )}
            </div>

            {getSystemMessagesAfter(msg.id).map((sm) => (
              <div
                key={sm.id}
                className={`mx-2 mt-2 px-3 py-2 rounded-xl text-[11px] leading-relaxed whitespace-pre-wrap ${
                  sm.type === "commit-report"
                    ? "bg-[#E6FAF5] border border-[#00B894]/20 text-[#065F46]"
                    : "bg-[#F5F5F3] border border-[#E4E4E0] text-[#5F6B7A]"
                }`}
              >
                {sm.type === "commit-report" && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <GitCommit size={11} className="text-[#00B894]" />
                    <span className="font-semibold text-[#00B894]">Shadow Commit</span>
                  </div>
                )}
                {sm.content}
                <div className="text-[9px] text-[#9DA5B0] mt-1 text-right">{sm.timestamp}</div>
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
          <div className="flex items-center gap-2 mx-2 px-3 py-2 bg-[#E8F2FF] rounded-xl border border-[#0079F2]/15">
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

      {/* Input — no <form>, direct onClick + Enter key */}
      <div className="px-3 py-2.5 border-t border-[#E4E4E0] bg-[#F9F9F7] shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="기능을 지시하세요... (예: 빨간 버튼 만들어줘)"
            className="flex-1 bg-white text-[#1D2433] text-xs px-3 py-2 rounded-xl border border-[#E4E4E0] focus:border-[#0079F2] focus:ring-1 focus:ring-[#0079F2]/20 outline-none placeholder-[#9DA5B0] transition-all"
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
        <div className="text-[9px] text-[#9DA5B0] mt-1.5 text-center">
          Field Nine AI — Shadow Commit Engine v3.1
        </div>
      </div>
    </div>
  );
}
