"use client";

import { RefObject, useState, useEffect, useRef } from "react";
import {
  Monitor,
  Globe,
  Loader2,
  CloudOff,
  RefreshCw,
  ExternalLink,
  MousePointer,
} from "lucide-react";
import AutoTestOverlay from "./AutoTestOverlay";

type ViewportSize = "desktop" | "tablet" | "mobile";

interface PreviewPanelProps {
  renderedHTML: string;
  viewport: ViewportSize;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  handleRun: () => void;
  vercelState: string;
  vercelUrl: string | null;
  vercelCommitMsg: string | null;
  deployedUrl: string | null;
  inspectorMode?: boolean;
  onInspectorToggle?: () => void;
  /** WebContainer dev server URL (when runtime is active) */
  wcServerUrl?: string | null;
  /** True while code change is being synced to preview */
  isSyncing?: boolean;
  /** Brief flash after sync completes */
  showSynced?: boolean;
  /** Trigger auto-test animation overlay */
  autoTestActive?: boolean;
  /** Called when auto-test animation finishes */
  onAutoTestComplete?: () => void;
}

const viewportWidths: Record<ViewportSize, string> = {
  desktop: "100%", tablet: "768px", mobile: "375px",
};

export default function PreviewPanel({
  renderedHTML,
  viewport,
  iframeRef,
  handleRun,
  vercelState,
  vercelUrl,
  vercelCommitMsg,
  deployedUrl,
  inspectorMode,
  onInspectorToggle,
  wcServerUrl,
  isSyncing,
  showSynced,
  autoTestActive,
  onAutoTestComplete,
}: PreviewPanelProps) {
  const liveUrl = vercelUrl ?? deployedUrl;

  /* ===== Update Overlay (blur + fade transition) ===== */
  const [overlayPhase, setOverlayPhase] = useState<"hidden" | "active" | "fading">("hidden");
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isSyncing) {
      // Show overlay immediately
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      setOverlayPhase("active");
    } else if (overlayPhase === "active") {
      // Sync just finished — hold briefly for iframe to render, then fade out
      fadeTimerRef.current = setTimeout(() => {
        setOverlayPhase("fading");
        // Remove after fade animation completes
        fadeTimerRef.current = setTimeout(() => {
          setOverlayPhase("hidden");
        }, 450);
      }, 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSyncing]);

  return (
    <div className="flex flex-col h-full bg-[var(--r-bg)]">
      {/* Webview header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--r-border)] shrink-0">
        <span className="text-[12px] font-medium text-[var(--r-text-secondary)]">Webview</span>
        <div
          className={`flex-1 flex items-center gap-1.5 bg-[var(--r-surface)] rounded-xl px-3 py-1 mx-2 border border-[var(--r-border)] ${liveUrl ? "cursor-pointer hover:border-[#0079f2] transition-colors" : ""}`}
          onClick={() => { if (liveUrl) window.open(liveUrl, "_blank"); }}
          title={liveUrl ? `${liveUrl} (클릭하여 새 탭에서 열기)` : "로컬 프리뷰"}
        >
          {isSyncing ? (
            <span className="flex items-center gap-1 text-[11px] text-[#0079F2] font-mono animate-pulse">
              ⚡ Syncing...
            </span>
          ) : showSynced ? (
            <span className="flex items-center gap-1 text-[11px] text-[#00b894] font-mono transition-opacity duration-300">
              ✓ Synced
            </span>
          ) : vercelState === "building" ? (
            <>
              <Loader2 size={10} className="text-[#f59e0b] animate-spin" />
              <span className="text-[11px] text-[#f59e0b] font-mono truncate">
                Building... {vercelCommitMsg ? `(${vercelCommitMsg})` : ""}
              </span>
            </>
          ) : liveUrl ? (
            <>
              <Globe size={10} className="text-[#00b894] shrink-0" />
              <span className="text-[11px] text-[var(--r-text)] font-mono truncate">{liveUrl}</span>
            </>
          ) : (
            <>
              <Monitor size={10} className="text-[var(--r-text-muted)] shrink-0" />
              <span className="text-[11px] text-[var(--r-text-muted)] font-mono truncate">Local Preview</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {onInspectorToggle && (
            <button
              type="button"
              onClick={onInspectorToggle}
              className={`p-1 rounded transition-colors ${inspectorMode ? "text-[#0079f2] bg-[#0079f2]/10" : "text-[var(--r-text-secondary)] hover:text-[var(--r-text)]"}`}
              aria-label="Inspector"
              title="Element Inspector (Ctrl+Shift+C)"
            >
              <MousePointer size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={handleRun}
            className="p-1 text-[var(--r-text-secondary)] hover:text-[var(--r-text)] rounded transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw size={12} />
          </button>
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-[var(--r-text-secondary)] hover:text-[var(--r-text)] rounded transition-colors"
              aria-label="Open deployed site"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* iframe */}
      <div className="flex-1 min-h-0 flex justify-center bg-white overflow-auto relative">
        {wcServerUrl ? (
          <iframe
            ref={iframeRef}
            src={wcServerUrl}
            title="WebContainer Preview"
            className="bg-white border-0 h-full transition-all duration-300"
            style={{ width: viewportWidths[viewport], maxWidth: "100%" }}
            allow="cross-origin-isolated"
          />
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={renderedHTML}
            title="Live Preview"
            className="bg-white border-0 h-full transition-all duration-300"
            style={{ width: viewportWidths[viewport], maxWidth: "100%" }}
            sandbox="allow-scripts allow-modals"
          />
        )}

        {/* Update Transition Overlay */}
        {overlayPhase !== "hidden" && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
            style={{
              backdropFilter: overlayPhase === "fading" ? "blur(0px)" : "blur(6px)",
              WebkitBackdropFilter: overlayPhase === "fading" ? "blur(0px)" : "blur(6px)",
              background: overlayPhase === "fading"
                ? "rgba(255, 255, 255, 0)"
                : "rgba(255, 255, 255, 0.55)",
              opacity: overlayPhase === "fading" ? 0 : 1,
              transition: "all 0.4s ease-out",
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm"
              style={{
                background: "rgba(255, 255, 255, 0.85)",
                border: "1px solid rgba(0, 121, 242, 0.15)",
                transform: overlayPhase === "fading" ? "scale(0.95) translateY(-4px)" : "scale(1) translateY(0)",
                opacity: overlayPhase === "fading" ? 0 : 1,
                transition: "all 0.35s ease-out",
              }}
            >
              <Loader2 size={14} className="animate-spin text-[#0079F2]" />
              <span className="text-[12px] font-medium text-[#1D2433]">업데이트 중...</span>
            </div>
          </div>
        )}

        {/* Auto Test Overlay */}
        {autoTestActive && (
          <AutoTestOverlay active={autoTestActive} onComplete={onAutoTestComplete ?? (() => {})} />
        )}
      </div>
    </div>
  );
}
