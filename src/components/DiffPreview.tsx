"use client";

import { useMemo } from "react";
import { Check, X, FileText } from "lucide-react";

interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  lineNum: number;
}

interface DiffPreviewProps {
  fileName: string;
  oldCode: string;
  newCode: string;
  onAccept: () => void;
  onReject: () => void;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table (optimized for typical file sizes)
  const maxLines = 500;
  if (m > maxLines || n > maxLines) {
    // Fallback: show all old as removed, all new as added
    for (let i = 0; i < m; i++) {
      result.push({ type: "remove", content: oldLines[i], lineNum: i + 1 });
    }
    for (let i = 0; i < n; i++) {
      result.push({ type: "add", content: newLines[i], lineNum: i + 1 });
    }
    return result;
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack
  const items: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      items.push({ type: "context", content: oldLines[i - 1], lineNum: i });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      items.push({ type: "add", content: newLines[j - 1], lineNum: j });
      j--;
    } else {
      items.push({ type: "remove", content: oldLines[i - 1], lineNum: i });
      i--;
    }
  }

  items.reverse();

  // Collapse long unchanged sections (keep 2 lines of context around changes)
  let lastChangeIdx = -1;
  const changeIndices = items.map((item, idx) => item.type !== "context" ? idx : -1).filter(i => i >= 0);

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (item.type !== "context") {
      result.push(item);
      lastChangeIdx = idx;
      continue;
    }

    // Find nearest change
    const nearestBefore = changeIndices.filter(ci => ci <= idx).pop() ?? -100;
    const nearestAfter = changeIndices.find(ci => ci >= idx) ?? items.length + 100;
    const distToChange = Math.min(idx - nearestBefore, nearestAfter - idx);

    if (distToChange <= 2 || changeIndices.length === 0) {
      result.push(item);
    } else if (distToChange === 3 && result.length > 0 && result[result.length - 1].type !== "context") {
      // Show "..." separator
      result.push({ type: "context", content: "···", lineNum: 0 });
    }
  }

  return result;
}

export default function DiffPreview({ fileName, oldCode, newCode, onAccept, onReject }: DiffPreviewProps) {
  const diffLines = useMemo(() => computeDiff(oldCode, newCode), [oldCode, newCode]);

  const addCount = diffLines.filter(l => l.type === "add").length;
  const removeCount = diffLines.filter(l => l.type === "remove").length;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onReject} />
      <div className="relative w-full max-w-[700px] max-h-[80vh] bg-[#1e1e1e] border border-[#404040] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#404040] shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-[#858585]" />
            <span className="text-[13px] text-[#e1e8f0] font-mono">{fileName}</span>
            <span className="text-[11px] text-[#00B894] font-mono">+{addCount}</span>
            <span className="text-[11px] text-[#EF4444] font-mono">-{removeCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReject}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#f87171] bg-[#f87171]/10 rounded-lg hover:bg-[#f87171]/20 transition-colors"
            >
              <X size={12} />
              Reject
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#00B894] bg-[#00B894]/10 rounded-lg hover:bg-[#00B894]/20 transition-colors"
            >
              <Check size={12} />
              Accept
            </button>
          </div>
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-y-auto font-mono text-[12px] leading-[20px]">
          {diffLines.map((line, idx) => (
            <div
              key={idx}
              className={`flex ${
                line.type === "add" ? "bg-[#00B894]/8" :
                line.type === "remove" ? "bg-[#EF4444]/8" :
                ""
              }`}
            >
              <span className={`w-10 text-right pr-2 select-none shrink-0 ${
                line.type === "add" ? "text-[#00B894]/50" :
                line.type === "remove" ? "text-[#EF4444]/50" :
                "text-[#555]"
              }`}>
                {line.lineNum || ""}
              </span>
              <span className={`w-5 text-center select-none shrink-0 ${
                line.type === "add" ? "text-[#00B894]" :
                line.type === "remove" ? "text-[#EF4444]" :
                "text-[#555]"
              }`}>
                {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
              </span>
              <span className={`flex-1 pr-4 ${
                line.type === "add" ? "text-[#00B894]" :
                line.type === "remove" ? "text-[#EF4444] line-through opacity-60" :
                "text-[#858585]"
              }`}>
                {line.content}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#404040] text-[10px] text-[#555] shrink-0">
          AI가 제안한 변경사항을 검토하세요. Accept로 적용, Reject로 취소합니다.
        </div>
      </div>
    </div>
  );
}
