"use client";

import Editor, { type OnMount, loader } from "@monaco-editor/react";
import { X } from "lucide-react";
import { getFileInfo } from "./FileExplorer";
import type { VFile } from "./FileExplorer";
import { useRef, useCallback } from "react";

// Configure Monaco — use default English UI (ko locale file missing from CDN)
loader.config({
  "vs/nls": { availableLanguages: {} },
});

type EditorTheme = "vs-dark" | "light" | "hc-black";

interface EditorTabsProps {
  files: Record<string, VFile>;
  activeFile: string;
  openTabs: string[];
  editorTheme: EditorTheme;
  onTabClick: (fileName: string) => void;
  onTabClose: (fileName: string, e: React.MouseEvent) => void;
  onCodeChange: (value: string | undefined) => void;
  compact?: boolean;
}

export default function EditorTabs({
  files,
  activeFile,
  openTabs,
  editorTheme,
  onTabClick,
  onTabClose,
  onCodeChange,
  compact = false,
}: EditorTabsProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteAbortRef = useRef<AbortController | null>(null);
  const disposableRef = useRef<{ dispose: () => void } | null>(null);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register AI inline completion provider
    disposableRef.current?.dispose();
    disposableRef.current = monaco.languages.registerInlineCompletionsProvider(
      ["html", "css", "javascript", "typescript", "json"],
      {
        provideInlineCompletions: async (
          model: InstanceType<typeof monaco.editor.EditorModel>,
          position: InstanceType<typeof monaco.Position>,
          _context: unknown,
          token: { isCancellationRequested: boolean }
        ) => {
          // Debounce: wait 600ms of no typing
          if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);

          return new Promise((resolve) => {
            autocompleteTimerRef.current = setTimeout(async () => {
              if (token.isCancellationRequested) {
                resolve({ items: [] });
                return;
              }

              try {
                const textUntilPosition = model.getValueInRange({
                  startLineNumber: 1,
                  startColumn: 1,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                });
                const textAfterPosition = model.getValueInRange({
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: model.getLineCount(),
                  endColumn: model.getLineMaxColumn(model.getLineCount()),
                });

                // Only trigger after 3+ chars on current line
                const currentLine = model.getLineContent(position.lineNumber);
                if (currentLine.trim().length < 3) {
                  resolve({ items: [] });
                  return;
                }

                // Cancel previous in-flight request
                autocompleteAbortRef.current?.abort();
                const controller = new AbortController();
                autocompleteAbortRef.current = controller;

                const res = await fetch("/api/autocomplete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    prefix: textUntilPosition,
                    suffix: textAfterPosition,
                    language: model.getLanguageId(),
                    fileName: activeFile,
                  }),
                  signal: controller.signal,
                });

                if (!res.ok || token.isCancellationRequested) {
                  resolve({ items: [] });
                  return;
                }

                const data = await res.json();
                if (!data.completion) {
                  resolve({ items: [] });
                  return;
                }

                resolve({
                  items: [{
                    insertText: data.completion,
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column,
                    },
                  }],
                });
              } catch {
                resolve({ items: [] });
              }
            }, 600);
          });
        },
        freeInlineCompletions: () => {},
      }
    );
  }, [activeFile]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Tab Bar */}
      <div className="flex items-center bg-[#252526] pl-1 overflow-x-auto shrink-0 border-b border-[#404040]">
        {openTabs.map((tab) => {
          const file = files[tab];
          if (!file) return null;
          const info = getFileInfo(tab);
          const Icon = info.icon;
          const isActive = activeFile === tab;
          return (
            <div
              key={tab}
              onClick={() => onTabClick(tab)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-[12px] cursor-pointer shrink-0 transition-all rounded-t-lg mt-1 mx-0.5 ${
                isActive
                  ? "bg-[#1e1e1e] text-[#e1e8f0]"
                  : "text-[#858585] hover:text-[#cccccc] hover:bg-[#2d2d2d]"
              }`}
            >
              <Icon size={13} className={info.color} />
              <span className="font-mono">{tab}</span>
              <button
                type="button"
                onClick={(e) => onTabClose(tab, e)}
                className={`ml-1 rounded p-0.5 transition-all ${
                  isActive
                    ? "text-[#858585] hover:text-[#e1e8f0] hover:bg-[#404040]"
                    : "opacity-0 group-hover:opacity-100 hover:bg-[#404040]"
                }`}
                aria-label={`Close ${tab}`}
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={files[activeFile]?.language ?? "html"}
          value={files[activeFile]?.content ?? ""}
          onChange={onCodeChange}
          theme={editorTheme}
          onMount={handleEditorMount}
          options={{
            fontSize: 13,
            lineHeight: 22,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: compact ? 8 : 12 },
            fontFamily: "var(--font-geist-mono), 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: !compact,
            wordWrap: "on",
            tabSize: 2,
            automaticLayout: true,
            bracketPairColorization: { enabled: !compact },
            smoothScrolling: !compact,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: compact ? "off" : "on",
            renderLineHighlight: "line",
            lineNumbers: "on",
            glyphMargin: false,
            folding: !compact,
            links: true,
            contextmenu: !compact,
            inlineSuggest: { enabled: true },
            suggest: compact ? undefined : { showMethods: true, showFunctions: true, showVariables: true, showWords: true },
          }}
        />
      </div>
    </div>
  );
}
