/* eslint-disable react-hooks/preserve-manual-memoization */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
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

/** Extract full text from a UIMessage's parts array */
function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

const WELCOME_TEXT =
  "안녕하세요, 보스! Field Nine AI입니다.\n\n기능을 지시하시면 코드를 생성하고 서버에 자동 반영합니다.\n\n예시: \"빨간 버튼 만들어줘\", \"히어로 섹션 추가해줘\", \"다크모드 토글\"";

export default function AIChatPanel({ onInsertCode, activeFile, currentFiles, onShadowCommit }: AIChatPanelProps) {
  const [isCommitting, setIsCommitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages: chatMessages,
    sendMessage,
    status,
    error,
    regenerate,
    clearError,
  } = useChat({
    onError: (err) => {
      console.error("[AIChatPanel] useChat error:", err);
    },
    onFinish: async ({ message }) => {
      const text = getMessageText(message);
      await handleAIResponseComplete(message.id, text);
    },
  });

  const isActive = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, systemMessages, isActive, isCommitting]);

  const shadowCommit = useCallback(
    async (fileChanges: FileChange[], commitMsg: string): Promise<boolean> => {
      if (onShadowCommit) {
        return onShadowCommit(fileChanges, commitMsg);
      }
      try {
        const res = await fetch("/api/save-code", {
          method: "POST",
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

      // Insert code into editor
      for (const block of parsed.codeBlocks) {
        onInsertCode(block.code, block.targetFile);
      }

      // Shadow Commit
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
          "코드가 에디터에 삽입되었습니다.\n\n💡 GitHub 커밋을 활성화하려면:\n1. `.env.local` 파일에 `GITHUB_TOKEN` 설정\n2. 개발 서버 재시작",
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isActive || isCommitting) return;
    const userText = inputValue.trim();
    setInputValue("");

    // Build code context prefix so AI knows current state
    let contextPrefix = "";
    if (currentFiles && Object.keys(currentFiles).length > 0) {
      const snippets = Object.entries(currentFiles)
        .map(([, f]) => `--- ${f.name} ---\n${f.content.slice(0, 2000)}`)
        .join("\n\n");
      contextPrefix = `[현재 프로젝트 코드]\n${snippets}\n\n[사용자 요청]\n`;
    }

    try {
      await sendMessage({ text: contextPrefix + userText });
    } catch (err) {
      console.error("[AIChatPanel] sendMessage failed:", err);
    }
  };

  // Parse code blocks from a message for rendering
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

  // Get system messages that should appear after a specific message
  const getSystemMessagesAfter = (messageId: string) =>
    systemMessages.filter((sm) => sm.afterMessageId === messageId);

  // Error display helper
  const getErrorText = (err: Error): string => {
    const msg = err.message || "";
    if (msg.includes("503") || msg.includes("not configured")) {
      return "⚠️ API 키가 설정되지 않았습니다.\n\n`.env.local` 파일에 다음을 추가하세요:\n• AI_PROVIDER=anthropic\n• ANTHROPIC_API_KEY=sk-ant-...\n\n또는 OpenAI를 사용하려면:\n• AI_PROVIDER=openai\n• OPENAI_API_KEY=sk-...";
    }
    if (msg.includes("429") || msg.includes("rate")) {
      return "⚠️ API 요청 제한에 도달했습니다.\n잠시 후 다시 시도해주세요.";
    }
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed")) {
      return "⚠️ 네트워크 오류가 발생했습니다.\n인터넷 연결을 확인하고 다시 시도해주세요.";
    }
    return `⚠️ 오류가 발생했습니다: ${msg}`;
  };

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
        {isActive && !isCommitting && (
          <span className="flex items-center gap-1 text-[10px] text-[#0079F2] ml-auto">
            <Loader2 size={10} className="animate-spin" /> Streaming...
          </span>
        )}
        {!isCommitting && !isActive && (
          <span className="text-[10px] bg-[#00B894]/10 text-[#00B894] px-1.5 py-0.5 rounded-full ml-auto font-medium">
            Ready
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 bg-white">
        {/* Static welcome message (not sent to API) */}
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0079F2] to-[#00c2ff] flex items-center justify-center shrink-0 mt-0.5">
            <Bot size={12} className="text-white" />
          </div>
          <div className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed bg-[#F5F5F3] text-[#1D2433] rounded-bl-sm">
            <div className="whitespace-pre-wrap">{WELCOME_TEXT}</div>
          </div>
        </div>

        {chatMessages.map((msg) => {
          const text = getMessageText(msg);
          return (
            <div key={msg.id}>
              {/* User / AI messages */}
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
                    ? renderMessageContent(text, msg.id)
                    : <div className="whitespace-pre-wrap">{text}</div>
                  }
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-[#E4E4E0] flex items-center justify-center shrink-0 mt-0.5">
                    <User size={12} className="text-[#5F6B7A]" />
                  </div>
                )}
              </div>

              {/* System messages after this message */}
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
          );
        })}

        {/* Typing indicator — show when submitted but not yet streaming */}
        {status === "submitted" && (
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

        {/* Committing indicator */}
        {isCommitting && (
          <div className="flex items-center gap-2 mx-2 px-3 py-2 bg-[#E8F2FF] rounded-xl border border-[#0079F2]/15">
            <Loader2 size={12} className="animate-spin text-[#0079F2]" />
            <span className="text-[11px] text-[#0079F2]">GitHub에 커밋 중... Vercel 자동 빌드 트리거</span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mx-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-700 leading-relaxed">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle size={12} className="text-red-500" />
              <span className="font-semibold">오류 발생</span>
            </div>
            <div className="whitespace-pre-wrap">{getErrorText(error)}</div>
            <button
              type="button"
              onClick={() => {
                clearError();
                regenerate();
              }}
              className="mt-2 flex items-center gap-1 text-[10px] bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-lg transition-colors"
            >
              <RefreshCw size={10} />
              다시 시도
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleFormSubmit} className="px-3 py-2.5 border-t border-[#E4E4E0] bg-[#F9F9F7] shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="기능을 지시하세요... (예: 빨간 버튼 만들어줘)"
            className="flex-1 bg-white text-[#1D2433] text-xs px-3 py-2 rounded-xl border border-[#E4E4E0] focus:border-[#0079F2] focus:ring-1 focus:ring-[#0079F2]/20 outline-none placeholder-[#9DA5B0] transition-all"
            disabled={isActive || isCommitting}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isActive || isCommitting}
            className="p-2 bg-[#0079F2] text-white rounded-xl hover:bg-[#0066CC] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Send message"
          >
            <Send size={12} />
          </button>
        </div>
        <div className="text-[9px] text-[#9DA5B0] mt-1.5 text-center">
          Field Nine AI — Shadow Commit Engine v2.0
        </div>
      </form>
    </div>
  );
}
