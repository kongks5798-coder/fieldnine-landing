"use client";

import { useEffect, useState } from "react";
import { Bot, Check } from "lucide-react";
import type { IDEAction } from "@/lib/ideActions";
import { describeAction } from "@/lib/ideActions";

interface AIStatusIndicatorProps {
  action: IDEAction | null;
}

export default function AIStatusIndicator({ action }: AIStatusIndicatorProps) {
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [phase, setPhase] = useState<"active" | "done">("active");

  useEffect(() => {
    if (!action) {
      setVisible(false);
      return;
    }

    setDisplayText(describeAction(action));
    setPhase("active");
    setVisible(true);

    // Show "done" after 800ms, then hide after 2s
    const doneTimer = setTimeout(() => setPhase("done"), 800);
    const hideTimer = setTimeout(() => setVisible(false), 2500);

    return () => {
      clearTimeout(doneTimer);
      clearTimeout(hideTimer);
    };
  }, [action]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm border transition-colors duration-300 ${
          phase === "done"
            ? "bg-[#00B894]/90 border-[#00B894]/30 text-white"
            : "bg-[#0D1117]/90 border-[#0079F2]/30 text-[#E6EDF3]"
        }`}
      >
        {phase === "done" ? (
          <Check size={14} className="text-white" />
        ) : (
          <Bot size={14} className="text-[#0079F2] animate-pulse" />
        )}
        <span className="text-xs font-medium whitespace-nowrap">
          {phase === "done" ? "완료" : "AI"}: {displayText}
        </span>
      </div>
    </div>
  );
}
