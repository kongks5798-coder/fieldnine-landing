"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Trash2,
  X,
  Loader2,
  GitCommitHorizontal,
  Power,
  RefreshCw,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function commitBadge(msg: string): { label: string; color: string } | null {
  const m = msg.toLowerCase();
  if (m.startsWith("feat")) return { label: "feat", color: "bg-[#238636]/20 text-[#3fb950]" };
  if (m.startsWith("fix")) return { label: "fix", color: "bg-[#f87171]/15 text-[#f87171]" };
  if (m.startsWith("chore") || m.startsWith("auto")) return { label: "auto", color: "bg-[#fbbf24]/15 text-[#fbbf24]" };
  if (m.startsWith("revert")) return { label: "revert", color: "bg-[#a78bfa]/15 text-[#a78bfa]" };
  if (m.startsWith("refactor")) return { label: "refactor", color: "bg-[#60a5fa]/15 text-[#60a5fa]" };
  return null;
}

const WebTerminal = dynamic(() => import("./WebTerminal"), { ssr: false });

/* ===== Structured Console Arg Types ===== */
export interface ConsoleArg {
  argType: "string" | "number" | "boolean" | "object" | "array" | "null" | "undefined" | "function";
  value: string;
  preview: string;
}

export interface ConsoleLine {
  type: "log" | "error" | "warn" | "info";
  text: string;
  time: string;
  args?: ConsoleArg[];
}

export interface GitCommitEntry {
  sha: string;
  fullSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export type ConsoleTab = "console" | "shell" | "history";

interface ConsolePanelProps {
  consoleTab: ConsoleTab;
  setConsoleTab: (v: ConsoleTab) => void;
  consoleLines: ConsoleLine[];
  setConsoleLines: React.Dispatch<React.SetStateAction<ConsoleLine[]>>;
  consoleFilter: ConsoleLine["type"] | "all";
  setConsoleFilter: (v: ConsoleLine["type"] | "all") => void;
  shellHistory: string[];
  setShellHistory: React.Dispatch<React.SetStateAction<string[]>>;
  shellInput: string;
  setShellInput: (v: string) => void;
  handleShellSubmit: (cmd: string) => void;
  gitHistory: GitCommitEntry[];
  gitLoading: boolean;
  fetchGitHistory: () => void;
  restoringCommit: string | null;
  handleGitRestore: (sha: string) => void;
  onCollapse: () => void;
  onAIFix?: (errorText: string) => void;
  /** REPL eval bridge */
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  /** WebContainer integration */
  wcEnabled?: boolean;
  onWcToggle?: () => void;
  wcStatus?: string;
  wcShellProcess?: import("@webcontainer/api").WebContainerProcess | null;
}

const consoleColorMap: Record<string, string> = {
  log: "text-[#d4d4d4]", error: "text-[#f87171]", warn: "text-[#fbbf24]", info: "text-[#60a5fa]",
};

/* ===== Rich Console Arg Renderer ===== */
function ConsoleArgValue({ arg }: { arg: ConsoleArg }) {
  const [expanded, setExpanded] = useState(false);

  switch (arg.argType) {
    case "string":
      return <span className="text-[#ce9178]">&quot;{arg.preview}&quot;</span>;
    case "number":
      return <span className="text-[#b5cea8]">{arg.preview}</span>;
    case "boolean":
      return <span className="text-[#569cd6]">{arg.preview}</span>;
    case "null":
      return <span className="text-[#858585] italic">null</span>;
    case "undefined":
      return <span className="text-[#858585] italic">undefined</span>;
    case "function":
      return <span className="text-[#dcdcaa] italic">{arg.preview}</span>;
    case "object":
    case "array": {
      const isArr = arg.argType === "array";
      return (
        <span className="inline">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-0.5 text-[#858585] hover:text-[#cccccc] transition-colors"
          >
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <span className="text-[#dcdcaa]">{isArr ? `Array(${arg.preview})` : arg.preview}</span>
          </button>
          {expanded && (
            <pre className="ml-3 mt-0.5 text-[11px] text-[#d4d4d4] bg-[#252526] rounded p-1.5 border border-[#333] max-h-[200px] overflow-auto whitespace-pre-wrap">
              {(() => {
                try { return JSON.stringify(JSON.parse(arg.value), null, 2); }
                catch { return arg.value; }
              })()}
            </pre>
          )}
        </span>
      );
    }
    default:
      return <span>{arg.preview}</span>;
  }
}

function RichConsoleLine({ line, onAIFix }: { line: ConsoleLine; onAIFix?: (text: string) => void }) {
  // If structured args available, render rich; otherwise fall back to flat text
  if (line.args && line.args.length > 0) {
    return (
      <div className={`flex items-start gap-2 py-[2px] border-b border-[#333333] ${consoleColorMap[line.type]}`}>
        <span className="text-[#858585] shrink-0 select-none">{line.time}</span>
        <span className="break-all flex-1 flex flex-wrap items-start gap-1">
          {line.args.map((arg, i) => (
            <ConsoleArgValue key={i} arg={arg} />
          ))}
        </span>
        {line.type === "error" && onAIFix && (
          <button
            type="button"
            onClick={() => onAIFix(line.text)}
            className="shrink-0 text-[10px] text-[#0079f2] bg-[#0079f2]/10 px-1.5 py-0.5 rounded hover:bg-[#0079f2]/20 transition-colors whitespace-nowrap"
          >
            AI Fix
          </button>
        )}
      </div>
    );
  }

  // Fallback: flat text rendering (backward compatible)
  return (
    <div className={`flex items-start gap-2 py-[2px] border-b border-[#333333] ${consoleColorMap[line.type]}`}>
      <span className="text-[#858585] shrink-0 select-none">{line.time}</span>
      <span className="break-all flex-1">{line.text}</span>
      {line.type === "error" && onAIFix && (
        <button
          type="button"
          onClick={() => onAIFix(line.text)}
          className="shrink-0 text-[10px] text-[#0079f2] bg-[#0079f2]/10 px-1.5 py-0.5 rounded hover:bg-[#0079f2]/20 transition-colors whitespace-nowrap"
        >
          AI Fix
        </button>
      )}
    </div>
  );
}

export default function ConsolePanel({
  consoleTab,
  setConsoleTab,
  consoleLines,
  setConsoleLines,
  consoleFilter,
  setConsoleFilter,
  shellHistory,
  setShellHistory,
  shellInput,
  setShellInput,
  handleShellSubmit,
  gitHistory,
  gitLoading,
  fetchGitHistory,
  restoringCommit,
  handleGitRestore,
  onCollapse,
  onAIFix,
  iframeRef,
  wcEnabled,
  onWcToggle,
  wcStatus,
  wcShellProcess,
}: ConsolePanelProps) {
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const shellInputRef = useRef<HTMLInputElement>(null);
  const replInputRef = useRef<HTMLInputElement>(null);

  // Shell command history navigation
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdHistoryIdx, setCmdHistoryIdx] = useState(-1);

  // REPL input
  const [replInput, setReplInput] = useState("");

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLines]);

  // Shell submit with history tracking
  const handleShellWithHistory = useCallback((cmd: string) => {
    if (!cmd.trim()) return;
    setCmdHistory((prev) => [...prev, cmd]);
    setCmdHistoryIdx(-1);
    handleShellSubmit(cmd);
  }, [handleShellSubmit]);

  // Shell input key handler (Up/Down for history)
  const handleShellKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleShellWithHistory(shellInput);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const newIdx = cmdHistoryIdx === -1 ? cmdHistory.length - 1 : Math.max(0, cmdHistoryIdx - 1);
      setCmdHistoryIdx(newIdx);
      setShellInput(cmdHistory[newIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cmdHistoryIdx === -1) return;
      const newIdx = cmdHistoryIdx + 1;
      if (newIdx >= cmdHistory.length) {
        setCmdHistoryIdx(-1);
        setShellInput("");
      } else {
        setCmdHistoryIdx(newIdx);
        setShellInput(cmdHistory[newIdx]);
      }
    }
  }, [shellInput, cmdHistory, cmdHistoryIdx, handleShellWithHistory, setShellInput]);

  // REPL submit: eval in iframe
  const handleReplSubmit = useCallback(() => {
    if (!replInput.trim()) return;
    const code = replInput.trim();
    setReplInput("");

    // Add the input line to console as "info" type
    const now = new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    setConsoleLines((prev) => [
      ...prev.slice(-50),
      { type: "info", text: `> ${code}`, time: now },
    ]);

    // Send eval to iframe
    if (iframeRef?.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { source: "fn-repl", code },
        "*" // sandboxed iframe has null origin, wildcard required
      );
    }
  }, [replInput, iframeRef, setConsoleLines]);

  return (
    <div className="h-full bg-transparent flex flex-col">
      <div className="flex items-center bg-[#252526]/60 backdrop-blur-xl border-b border-white/[0.06] shrink-0">
        <div className="flex" role="tablist" aria-label="콘솔 패널 탭">
          <button
            type="button"
            role="tab"
            aria-selected={consoleTab === "console"}
            onClick={() => setConsoleTab("console")}
            className={`px-4 py-1.5 text-[12px] font-medium transition-colors relative ${
              consoleTab === "console" ? "text-[#e1e8f0]" : "text-[#858585] hover:text-[#cccccc]"
            }`}
          >
            Console
            {consoleTab === "console" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0079f2]" />}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={consoleTab === "shell"}
            onClick={() => setConsoleTab("shell")}
            className={`px-4 py-1.5 text-[12px] font-medium transition-colors relative ${
              consoleTab === "shell" ? "text-[#e1e8f0]" : "text-[#858585] hover:text-[#cccccc]"
            }`}
          >
            Shell
            {consoleTab === "shell" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0079f2]" />}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={consoleTab === "history"}
            onClick={() => { setConsoleTab("history"); fetchGitHistory(); }}
            className={`px-4 py-1.5 text-[12px] font-medium transition-colors relative ${
              consoleTab === "history" ? "text-[#e1e8f0]" : "text-[#858585] hover:text-[#cccccc]"
            }`}
          >
            History
            {consoleTab === "history" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0079f2]" />}
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1 pr-2">
          {consoleTab === "console" && consoleLines.length > 0 && (
            <span className="text-[10px] bg-[#0079f2]/20 text-[#0079f2] px-1.5 py-0.5 rounded-full font-mono">
              {consoleLines.length}
            </span>
          )}
          <button
            type="button"
            onClick={() => consoleTab === "console" ? setConsoleLines([]) : setShellHistory([])}
            className="text-[#858585] hover:text-[#cccccc] p-0.5 rounded transition-colors"
            aria-label="Clear"
          >
            <Trash2 size={11} />
          </button>
          <button
            type="button"
            onClick={onCollapse}
            className="text-[#858585] hover:text-[#cccccc] p-0.5 rounded transition-colors"
            aria-label="Close"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {consoleTab === "console" ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-1 px-3 py-1 bg-[#1e1e1e]/40 backdrop-blur-sm border-b border-white/[0.04] shrink-0">
            {(["all", "log", "warn", "error"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setConsoleFilter(f)}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  consoleFilter === f
                    ? "bg-[#0079f2]/20 text-[#60a5fa]"
                    : "text-[#858585] hover:text-[#cccccc]"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== "all" && (
                  <span className="ml-0.5 text-[9px] opacity-60">
                    {consoleLines.filter((l) => l.type === f).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[12px] min-h-0 bg-[#0d1117]/30">
            {consoleLines.length === 0 ? (
              <div className="text-[#858585] py-3 italic">No console output yet...</div>
            ) : (
              consoleLines
                .filter((l) => consoleFilter === "all" || l.type === consoleFilter)
                .map((line, i) => (
                  <RichConsoleLine key={i} line={line} onAIFix={onAIFix} />
                ))
            )}
            <div ref={consoleEndRef} />
          </div>
          {/* REPL Input */}
          <div className="flex items-center px-3 py-1.5 bg-[#252526]/50 backdrop-blur-xl border-t border-white/[0.06] shrink-0">
            <span className="text-[#569cd6] text-[12px] font-mono mr-2 font-bold">&gt;</span>
            <input
              ref={replInputRef}
              type="text"
              value={replInput}
              onChange={(e) => setReplInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleReplSubmit();
              }}
              placeholder="Evaluate JavaScript..."
              className="flex-1 bg-transparent text-[12px] text-[#e1e8f0] placeholder-[#858585] outline-none font-mono"
            />
          </div>
        </div>
      ) : consoleTab === "shell" ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* WebContainer toggle bar */}
          {onWcToggle && (
            <div className="flex items-center gap-2 px-3 py-1 border-b border-white/[0.06] shrink-0">
              <button
                type="button"
                onClick={onWcToggle}
                className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-lg transition-colors ${
                  wcEnabled
                    ? "bg-[#00b894]/15 text-[#00b894] border border-[#00b894]/30"
                    : "bg-[#333] text-[#858585] border border-[#404040] hover:text-[#d4d4d4]"
                }`}
              >
                <Power size={9} />
                {wcEnabled ? "Runtime ON" : "Runtime OFF"}
              </button>
              {wcStatus === "booting" && (
                <span className="flex items-center gap-1 text-[10px] text-[#fbbf24]">
                  <Loader2 size={9} className="animate-spin" /> Booting Node.js...
                </span>
              )}
              {wcStatus === "ready" && (
                <span className="text-[10px] text-[#00b894]">Node.js ready</span>
              )}
              {wcStatus === "error" && (
                <span className="text-[10px] text-[#f87171]">Boot failed (COOP/COEP required)</span>
              )}
            </div>
          )}

          {/* Quick install buttons */}
          {wcEnabled && wcStatus === "ready" && (
            <div className="flex items-center gap-1 px-3 py-1 border-b border-white/[0.06] shrink-0 overflow-x-auto">
              <span className="text-[9px] text-[#858585] shrink-0 mr-1">Quick:</span>
              {[
                { label: "React", cmd: "npm i react react-dom" },
                { label: "Tailwind", cmd: "npm i tailwindcss" },
                { label: "Express", cmd: "npm i express" },
                { label: "Vite", cmd: "npm i vite" },
              ].map((pkg) => (
                <button
                  key={pkg.label}
                  type="button"
                  onClick={() => handleShellSubmit(pkg.cmd)}
                  className="px-2 py-[2px] text-[9px] text-[#60a5fa] bg-[#0079f2]/10 rounded hover:bg-[#0079f2]/20 transition-colors shrink-0"
                >
                  {pkg.label}
                </button>
              ))}
            </div>
          )}

          {/* Real terminal (WebContainer) or fallback shell */}
          {wcEnabled && wcStatus === "ready" && wcShellProcess ? (
            <div className="flex-1 min-h-0">
              <WebTerminal shellProcess={wcShellProcess} />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[12px] min-h-0">
                {shellHistory.map((line, i) => (
                  <div key={i} className={`py-[1px] ${
                    line.startsWith("$") ? ""
                    : line.includes("added") || line.includes("success") ? "text-[#3fb950]"
                    : line.includes("ERR") || line.includes("error") ? "text-[#f87171]"
                    : line.includes("WARN") || line.includes("warn") ? "text-[#fbbf24]"
                    : "text-[#d4d4d4]"
                  }`}>
                    {line.startsWith("$ ") ? (
                      <span>
                        <span className="text-[#3fb950]">user@f9</span>
                        <span className="text-[#858585]">:</span>
                        <span className="text-[#569cd6]">~/project</span>
                        <span className="text-[#d4d4d4]">$ </span>
                        <span className="text-[#e1e8f0]">{line.slice(2)}</span>
                      </span>
                    ) : (
                      line
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center px-3 py-1.5 bg-[#252526]/50 backdrop-blur-xl border-t border-white/[0.06] shrink-0">
                <span className="font-mono text-[12px] mr-1">
                  <span className="text-[#3fb950]">user@f9</span>
                  <span className="text-[#858585]">:</span>
                  <span className="text-[#569cd6]">~</span>
                  <span className="text-[#d4d4d4]">$ </span>
                </span>
                <input
                  ref={shellInputRef}
                  type="text"
                  value={shellInput}
                  onChange={(e) => setShellInput(e.target.value)}
                  onKeyDown={handleShellKeyDown}
                  placeholder={wcEnabled ? "Booting runtime..." : "npm install, node, ls, cat ..."}
                  className="flex-1 bg-transparent text-[12px] text-[#e1e8f0] placeholder-[#858585] outline-none font-mono"
                  disabled={wcEnabled && wcStatus !== "ready"}
                />
              </div>
            </>
          )}
        </div>
      ) : (
        <HistoryTab
          gitHistory={gitHistory}
          gitLoading={gitLoading}
          fetchGitHistory={fetchGitHistory}
          restoringCommit={restoringCommit}
          handleGitRestore={handleGitRestore}
        />
      )}
    </div>
  );
}

/* ===== History Tab Component ===== */
function HistoryTab({
  gitHistory,
  gitLoading,
  fetchGitHistory,
  restoringCommit,
  handleGitRestore,
}: {
  gitHistory: GitCommitEntry[];
  gitLoading: boolean;
  fetchGitHistory: () => void;
  restoringCommit: string | null;
  handleGitRestore: (sha: string) => void;
}) {
  const [confirmSha, setConfirmSha] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[#333333] shrink-0">
        <span className="text-[10px] text-[#858585]">
          {gitHistory.length > 0 ? `${gitHistory.length} commits` : ""}
        </span>
        <button
          type="button"
          onClick={fetchGitHistory}
          disabled={gitLoading}
          className="text-[#858585] hover:text-[#cccccc] p-0.5 rounded transition-colors disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw size={11} className={gitLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Commit list */}
      <div className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[12px] min-h-0">
        {gitLoading && gitHistory.length === 0 ? (
          <div className="flex items-center gap-2 py-3 text-[#858585]">
            <Loader2 size={12} className="animate-spin" /> Loading commits...
          </div>
        ) : gitHistory.length === 0 ? (
          <div className="text-[#858585] py-3 italic">No commits found</div>
        ) : (
          <>
            {gitHistory.slice(0, visibleCount).map((commit) => {
              const badge = commitBadge(commit.message);
              const isConfirming = confirmSha === commit.fullSha;
              return (
                <div
                  key={commit.fullSha}
                  className="flex items-start gap-2 py-1.5 border-b border-[#333333] hover:bg-[#2d2d2d] rounded px-1 transition-colors group"
                >
                  <GitCommitHorizontal size={12} className="text-[#0079f2] mt-0.5 shrink-0" />
                  <a
                    href={commit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-1.5">
                      {badge && (
                        <span className={`px-1 py-[1px] text-[9px] rounded font-semibold shrink-0 ${badge.color}`}>
                          {badge.label}
                        </span>
                      )}
                      <span className="text-[#e1e8f0] truncate group-hover:text-[#60a5fa]">
                        {commit.message.split("\n")[0].replace(/^(feat|fix|chore|revert|refactor)\([^)]*\):\s*/i, "")}
                      </span>
                    </div>
                    <div className="text-[#858585] text-[10px] mt-0.5">
                      <span className="text-[#0079f2]">{commit.sha}</span>
                      {" · "}
                      {relativeTime(commit.date)}
                    </div>
                  </a>
                  {isConfirming ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => { handleGitRestore(commit.fullSha); setConfirmSha(null); }}
                        disabled={restoringCommit === commit.fullSha}
                        className="px-1.5 py-0.5 text-[10px] text-[#f87171] bg-[#f87171]/10 rounded hover:bg-[#f87171]/20 transition-colors disabled:opacity-50"
                      >
                        {restoringCommit === commit.fullSha ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : "확인"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmSha(null)}
                        className="px-1.5 py-0.5 text-[10px] text-[#858585] bg-[#333] rounded hover:bg-[#404040] transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmSha(commit.fullSha)}
                      className="opacity-0 group-hover:opacity-100 shrink-0 px-1.5 py-0.5 text-[10px] text-[#60a5fa] bg-[#0079f2]/10 rounded hover:bg-[#0079f2]/20 transition-all"
                    >
                      Restore
                    </button>
                  )}
                </div>
              );
            })}
            {visibleCount < gitHistory.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((v) => v + 20)}
                className="w-full py-2 text-[11px] text-[#60a5fa] hover:text-[#93bbfc] transition-colors"
              >
                + {gitHistory.length - visibleCount}개 더 보기
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
