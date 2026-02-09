"use client";

import { RefObject } from "react";
import {
  Monitor,
  Globe,
  Loader2,
  CloudOff,
  RefreshCw,
  ExternalLink,
  MousePointer,
} from "lucide-react";

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
}: PreviewPanelProps) {
  const liveUrl = vercelUrl ?? deployedUrl;

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
          {vercelState === "building" ? (
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
      <div className="flex-1 min-h-0 flex justify-center bg-white overflow-auto">
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
      </div>
    </div>
  );
}
