"use client";

import { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Trash2,
  X,
  Loader2,
  GitCommitHorizontal,
  Power,
} from "lucide-react";

const WebTerminal = dynamic(() => import("./WebTerminal"), { ssr: false });

export interface ConsoleLine {
  type: "log" | "error" | "warn" | "info";
  text: string;
  time: string;
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
  /** WebContainer integration */
  wcEnabled?: boolean;
  onWcToggle?: () => void;
  wcStatus?: string;
  wcShellProcess?: import("@webcontainer/api").WebContainerProcess | null;
}

const consoleColorMap: Record<string, string> = {
  log: "text-[#d4d4d4]", error: "text-[#f87171]", warn: "text-[#fbbf24]", info: "text-[#60a5fa]",
};

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
  wcEnabled,
  onWcToggle,
  wcStatus,
  wcShellProcess,
}: ConsolePanelProps) {
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLines]);

  return (
    <div className="h-full bg-[#1e1e1e] flex flex-col">
      <div className="flex items-center border-b border-[#404040] shrink-0">
        <div className="flex">
          <button
            type="button"
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
          <div className="flex items-center gap-1 px-3 py-1 border-b border-[#333333] shrink-0">
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
          <div className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[12px] min-h-0">
            {consoleLines.length === 0 ? (
              <div className="text-[#858585] py-3 italic">No console output yet...</div>
            ) : (
              consoleLines
                .filter((l) => consoleFilter === "all" || l.type === consoleFilter)
                .map((line, i) => (
                  <div key={i} className={`flex items-start gap-2 py-[2px] border-b border-[#333333] ${consoleColorMap[line.type]}`}>
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
                ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      ) : consoleTab === "shell" ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* WebContainer toggle bar */}
          {onWcToggle && (
            <div className="flex items-center gap-2 px-3 py-1 border-b border-[#404040] shrink-0">
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

          {/* Real terminal (WebContainer) or fallback shell */}
          {wcEnabled && wcStatus === "ready" && wcShellProcess ? (
            <div className="flex-1 min-h-0">
              <WebTerminal shellProcess={wcShellProcess} />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[12px] min-h-0">
                {shellHistory.map((line, i) => (
                  <div key={i} className={`py-[1px] ${line.startsWith("$") ? "text-[#00b894]" : "text-[#d4d4d4]"}`}>
                    {line}
                  </div>
                ))}
              </div>
              <div className="flex items-center px-3 py-1.5 border-t border-[#404040] shrink-0">
                <span className="text-[#00b894] text-[12px] font-mono mr-2">$</span>
                <input
                  type="text"
                  value={shellInput}
                  onChange={(e) => setShellInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleShellSubmit(shellInput);
                  }}
                  placeholder={wcEnabled ? "Booting runtime..." : "Type a command..."}
                  className="flex-1 bg-transparent text-[12px] text-[#e1e8f0] placeholder-[#858585] outline-none font-mono"
                  disabled={wcEnabled && wcStatus !== "ready"}
                />
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[12px] min-h-0">
          {gitLoading ? (
            <div className="flex items-center gap-2 py-3 text-[#858585]">
              <Loader2 size={12} className="animate-spin" /> Loading commits...
            </div>
          ) : gitHistory.length === 0 ? (
            <div className="text-[#858585] py-3 italic">No commits found</div>
          ) : (
            gitHistory.map((commit) => (
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
                  <div className="text-[#e1e8f0] truncate group-hover:text-[#60a5fa]">
                    {commit.message.split("\n")[0]}
                  </div>
                  <div className="text-[#858585] text-[10px] mt-0.5">
                    <span className="text-[#0079f2]">{commit.sha}</span>
                    {" · "}
                    {new Date(commit.date).toLocaleString("ko-KR", {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </a>
                <button
                  type="button"
                  onClick={() => handleGitRestore(commit.fullSha)}
                  disabled={restoringCommit === commit.fullSha}
                  className="opacity-0 group-hover:opacity-100 shrink-0 px-1.5 py-0.5 text-[10px] text-[#60a5fa] bg-[#0079f2]/10 rounded hover:bg-[#0079f2]/20 transition-all disabled:opacity-50"
                >
                  {restoringCommit === commit.fullSha ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    "Restore"
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
