"use client";

import { useState } from "react";
import { Loader2, Check, X, ChevronDown, ChevronRight } from "lucide-react";

export interface TaskStage {
  id: string;
  label: string;
  emoji: string;
  status: "pending" | "active" | "done" | "error";
  detail?: string;
}

export interface SubTaskItem {
  id: string;
  description: string;
  status: string;
}

interface TaskProgressCardProps {
  stages: TaskStage[];
  subtasks?: SubTaskItem[];
}

export default function TaskProgressCard({ stages, subtasks }: TaskProgressCardProps) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  if (stages.length === 0) return null;

  const toggleDetail = (id: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeIdx = stages.findIndex((s) => s.status === "active");

  return (
    <div className="bg-[var(--r-bg)] rounded-lg border border-[var(--r-border)] p-2 mb-2">
      <div className="relative">
        {stages.map((stage, idx) => {
          const isLast = idx === stages.length - 1;
          const isExpanded = expandedStages.has(stage.id);
          const hasDetail = !!stage.detail;
          // Connection line color: blue up to active, gray after
          const lineColor =
            stage.status === "done"
              ? "border-[#00B894]"
              : stage.status === "active"
                ? "border-[#0079F2]"
                : "border-[var(--r-border)]";

          return (
            <div key={stage.id} className="relative flex items-start">
              {/* Vertical connection line */}
              {!isLast && (
                <div
                  className={`absolute left-[9px] top-[20px] bottom-0 border-l-2 ${lineColor}`}
                />
              )}

              {/* Status icon */}
              <div className="relative z-10 flex items-center justify-center w-[20px] h-[20px] shrink-0">
                {stage.status === "done" && (
                  <div className="w-[18px] h-[18px] rounded-full bg-[#00B894] flex items-center justify-center">
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>
                )}
                {stage.status === "active" && (
                  <div className="w-[18px] h-[18px] rounded-full bg-[#0079F2]/15 flex items-center justify-center">
                    <Loader2 size={11} className="text-[#0079F2] animate-spin" />
                  </div>
                )}
                {stage.status === "pending" && (
                  <div className="w-[18px] h-[18px] rounded-full border-2 border-[var(--r-border)] bg-[var(--r-bg)]" />
                )}
                {stage.status === "error" && (
                  <div className="w-[18px] h-[18px] rounded-full bg-[#EF4444] flex items-center justify-center">
                    <X size={10} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Label + detail */}
              <div className={`flex-1 min-w-0 ml-2 ${isLast ? "" : "pb-1"}`}>
                <button
                  type="button"
                  onClick={() => hasDetail && toggleDetail(stage.id)}
                  className={`flex items-center gap-1 text-[11px] leading-[20px] font-medium transition-colors ${
                    hasDetail ? "cursor-pointer" : "cursor-default"
                  } ${
                    stage.status === "done"
                      ? "text-[#00B894]"
                      : stage.status === "active"
                        ? "text-[#0079F2]"
                        : stage.status === "error"
                          ? "text-[#EF4444]"
                          : "text-[var(--r-text-muted)]"
                  }`}
                >
                  <span>{stage.emoji}</span>
                  <span>{stage.label}</span>
                  {hasDetail && (
                    isExpanded
                      ? <ChevronDown size={10} className="opacity-50" />
                      : <ChevronRight size={10} className="opacity-50" />
                  )}
                </button>

                {/* Active row highlight */}
                {stage.status === "active" && (
                  <div className="absolute inset-0 -mx-1 bg-[#0079F2]/5 rounded pointer-events-none" />
                )}

                {/* Detail accordion */}
                {hasDetail && isExpanded && (
                  <div className="text-[10px] text-[var(--r-text-muted)] mt-0.5 pl-0.5 leading-relaxed">
                    {stage.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent subtasks */}
      {subtasks && subtasks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--r-border)]">
          <div className="text-[10px] text-[var(--r-text-muted)] mb-1 font-medium">서브태스크</div>
          <div className="space-y-0.5">
            {subtasks.map((st) => (
              <div key={st.id} className="flex items-center gap-1.5 text-[10px]">
                {st.status === "done" ? (
                  <Check size={9} className="text-[#00B894] shrink-0" />
                ) : st.status === "active" ? (
                  <Loader2 size={9} className="text-[#0079F2] animate-spin shrink-0" />
                ) : (
                  <div className="w-[9px] h-[9px] rounded-full border border-[var(--r-border)] shrink-0" />
                )}
                <span className={
                  st.status === "done" ? "text-[#00B894]" :
                  st.status === "active" ? "text-[#0079F2]" :
                  "text-[var(--r-text-muted)]"
                }>{st.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
