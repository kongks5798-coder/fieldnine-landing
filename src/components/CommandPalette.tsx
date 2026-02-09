"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search,
  FileCode2,
  FileText,
  FileCog,
  Play,
  Rocket,
  Sparkles,
  Moon,
  Sun,
  FilePlus2,
  Command,
  CornerDownLeft,
} from "lucide-react";
import type { VFile } from "./FileExplorer";

/* ===== Types ===== */
interface CommandItem {
  id: string;
  category: "file" | "code" | "action";
  label: string;
  detail?: string;
  icon: React.ElementType;
  iconColor?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  files: Record<string, VFile>;
  onOpenFile: (name: string) => void;
  onCreateFile: () => void;
  onDeploy: () => void;
  onToggleTheme: () => void;
  onToggleAI: () => void;
  onRun: () => void;
  theme: string;
}

const FILE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  html: { icon: FileCode2, color: "text-[#e44d26]" },
  css: { icon: FileText, color: "text-[#2965f1]" },
  js: { icon: FileCog, color: "text-[#f7df1e]" },
  json: { icon: FileCog, color: "text-[#5b5b5b]" },
};

function getExtIcon(name: string) {
  const ext = name.split(".").pop() ?? "";
  return FILE_ICONS[ext] ?? { icon: FileText, color: "text-[#858585]" };
}

export default function CommandPalette({
  isOpen,
  onClose,
  files,
  onOpenFile,
  onCreateFile,
  onDeploy,
  onToggleTheme,
  onToggleAI,
  onRun,
  theme,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build actions
  const actions: CommandItem[] = useMemo(() => [
    { id: "action-run", category: "action", label: "Run Preview", detail: "Ctrl+Shift+R", icon: Play, iconColor: "text-[#00B894]", action: () => { onRun(); onClose(); } },
    { id: "action-deploy", category: "action", label: "Deploy", detail: "Ctrl+Shift+D", icon: Rocket, iconColor: "text-[#0079F2]", action: () => { onDeploy(); onClose(); } },
    { id: "action-newfile", category: "action", label: "New File", icon: FilePlus2, iconColor: "text-[#0079F2]", action: () => { onCreateFile(); onClose(); } },
    { id: "action-ai", category: "action", label: "Toggle AI Panel", detail: "Ctrl+Shift+A", icon: Sparkles, iconColor: "text-[#8B5CF6]", action: () => { onToggleAI(); onClose(); } },
    { id: "action-theme", category: "action", label: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode", icon: theme === "dark" ? Sun : Moon, iconColor: "text-[#F59E0B]", action: () => { onToggleTheme(); onClose(); } },
  ], [onRun, onDeploy, onCreateFile, onToggleAI, onToggleTheme, onClose, theme]);

  // Build results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const items: CommandItem[] = [];

    // Files (name match)
    const fileNames = Object.keys(files);
    const matchedFiles = q
      ? fileNames.filter((f) => f.toLowerCase().includes(q))
      : fileNames;

    for (const name of matchedFiles.slice(0, 10)) {
      const info = getExtIcon(name);
      items.push({
        id: `file-${name}`,
        category: "file",
        label: name,
        icon: info.icon,
        iconColor: info.color,
        action: () => { onOpenFile(name); onClose(); },
      });
    }

    // Code search (content grep, 2+ chars)
    if (q.length >= 2) {
      const seen = new Set<string>();
      for (const [name, file] of Object.entries(files)) {
        const lines = file.content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(q)) {
            const key = `${name}:${i + 1}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const info = getExtIcon(name);
            items.push({
              id: `code-${key}`,
              category: "code",
              label: `${name}:${i + 1}`,
              detail: lines[i].trim().slice(0, 60),
              icon: info.icon,
              iconColor: info.color,
              action: () => { onOpenFile(name); onClose(); },
            });
            if (seen.size >= 10) break;
          }
        }
        if (seen.size >= 10) break;
      }
    }

    // Actions
    const matchedActions = q
      ? actions.filter((a) => a.label.toLowerCase().includes(q))
      : actions;
    items.push(...matchedActions);

    return items.slice(0, 20);
  }, [query, files, actions, onOpenFile, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        results[selectedIndex]?.action();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [results, selectedIndex, onClose],
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const categoryLabels: Record<string, string> = {
    file: "Files",
    code: "Code",
    action: "Actions",
  };

  // Group by category
  const grouped: { category: string; items: (CommandItem & { globalIndex: number })[] }[] = [];
  let globalIdx = 0;
  const categoryOrder = ["file", "code", "action"];
  for (const cat of categoryOrder) {
    const catItems = results
      .filter((r) => r.category === cat)
      .map((r) => ({ ...r, globalIndex: globalIdx++ }));
    if (catItems.length > 0) {
      grouped.push({ category: cat, items: catItems });
    }
  }
  // fix globalIdx to match actual index from results
  let idx = 0;
  for (const g of grouped) {
    for (const item of g.items) {
      item.globalIndex = idx++;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[520px] mx-4 bg-[var(--r-bg)] border border-[var(--r-border)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--r-border)]">
          <Command size={16} className="text-[var(--r-text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files, code, or actions..."
            className="flex-1 bg-transparent text-sm text-[var(--r-text)] placeholder-[#9DA5B0] outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-[var(--r-text-muted)] bg-[var(--r-surface)] px-1.5 py-0.5 rounded border border-[var(--r-border)]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--r-text-muted)]">
              <Search size={24} className="mx-auto mb-2 opacity-30" />
              No results found
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.category}>
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--r-text-muted)]">
                  {categoryLabels[group.category]}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isSelected = item.globalIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-index={item.globalIndex}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(item.globalIndex)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        isSelected
                          ? "bg-[#0079F2]/10 text-[var(--r-text)]"
                          : "text-[var(--r-text-secondary)] hover:bg-[var(--r-surface-hover)]"
                      }`}
                    >
                      <Icon size={16} className={item.iconColor ?? "text-[var(--r-text-muted)]"} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium">{item.label}</span>
                        {item.detail && (
                          <span className="ml-2 text-[11px] text-[var(--r-text-muted)] truncate">{item.detail}</span>
                        )}
                      </div>
                      {isSelected && (
                        <CornerDownLeft size={12} className="text-[var(--r-text-muted)] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--r-border)] text-[10px] text-[var(--r-text-muted)]">
          <span className="flex items-center gap-1">
            <kbd className="bg-[var(--r-surface)] px-1 py-0.5 rounded border border-[var(--r-border)]">&uarr;&darr;</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-[var(--r-surface)] px-1 py-0.5 rounded border border-[var(--r-border)]">&crarr;</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-[var(--r-surface)] px-1 py-0.5 rounded border border-[var(--r-border)]">ESC</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
