"use client";

import { useRef, useState } from "react";
import {
  X,
  FilePlus2,
  Trash2,
  Search,
  Loader2,
  Check,
  Image as ImageIcon,
  Upload,
  Copy,
  Link,
  FileCode2,
  FileText,
  FileCog,
} from "lucide-react";
import type { AssetFile } from "@/hooks/useAssets";

/* ===== File Icon Helpers (shared) ===== */
const FILE_ICON_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  html: { icon: FileCode2, color: "text-[#e44d26]" },
  css: { icon: FileText, color: "text-[#2965f1]" },
  javascript: { icon: FileCog, color: "text-[#f7df1e]" },
  json: { icon: FileCog, color: "text-[#5b5b5b]" },
  markdown: { icon: FileText, color: "text-[#858585]" },
};

export function getFileInfo(fileName: string) {
  const ext = fileName.split(".").pop() ?? "";
  const langMap: Record<string, string> = {
    html: "html", htm: "html", css: "css", js: "javascript",
    json: "json", md: "markdown", txt: "plaintext", ts: "typescript",
  };
  const language = langMap[ext] ?? "plaintext";
  const info = FILE_ICON_MAP[language] ?? { icon: FileText, color: "text-[#858585]" };
  return { language, ...info };
}

/* ===== Types ===== */
export interface VFile {
  name: string;
  language: string;
  content: string;
  icon: React.ElementType;
}

export type ExplorerTab = "files" | "assets";

/* ===== Props ===== */
interface FileExplorerProps {
  files: Record<string, VFile>;
  activeFile: string;
  openFile: (name: string) => void;
  createFile: (name: string) => void;
  deleteFile: (name: string) => void;
  showNewFileInput: boolean;
  setShowNewFileInput: (v: boolean) => void;
  newFileName: string;
  setNewFileName: (v: string) => void;
  fileSearchQuery: string;
  setFileSearchQuery: (v: string) => void;
  explorerTab: ExplorerTab;
  setExplorerTab: (v: ExplorerTab) => void;
  assets: AssetFile[];
  uploading: boolean;
  loadAssets: () => void;
  uploadFiles: (files: FileList) => void;
  deleteAsset: (name: string) => void;
  isMobile: boolean;
  setShowFileExplorer: (v: boolean) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileExplorer({
  files,
  activeFile,
  openFile,
  createFile,
  deleteFile,
  showNewFileInput,
  setShowNewFileInput,
  newFileName,
  setNewFileName,
  fileSearchQuery,
  setFileSearchQuery,
  explorerTab,
  setExplorerTab,
  assets,
  uploading,
  loadAssets,
  uploadFiles,
  deleteAsset,
  isMobile,
  setShowFileExplorer,
}: FileExplorerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const allFileNames = Object.keys(files);
  const fileList = fileSearchQuery
    ? allFileNames.filter((f) => f.toLowerCase().includes(fileSearchQuery.toLowerCase()))
    : allFileNames;

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className={`bg-[var(--r-bg)] border-r border-[var(--r-border)] flex flex-col shrink-0 ${isMobile ? "fixed left-0 top-0 bottom-0 w-[260px] z-40 shadow-xl" : "w-[220px]"}`}>
      {/* Tab header: Files | Assets */}
      <div className="flex items-center border-b border-[var(--r-border)] shrink-0">
        <button
          type="button"
          onClick={() => setExplorerTab("files")}
          className={`flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors relative ${
            explorerTab === "files" ? "text-[var(--r-text)]" : "text-[var(--r-text-secondary)] hover:text-[var(--r-text)]"
          }`}
        >
          Files
          {explorerTab === "files" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0079f2]" />}
        </button>
        <button
          type="button"
          onClick={() => { setExplorerTab("assets"); loadAssets(); }}
          className={`flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors relative ${
            explorerTab === "assets" ? "text-[var(--r-text)]" : "text-[var(--r-text-secondary)] hover:text-[var(--r-text)]"
          }`}
        >
          Assets
          {explorerTab === "assets" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0079f2]" />}
        </button>
        <button
          type="button"
          onClick={() => setShowFileExplorer(false)}
          className="p-1 mr-1 text-[var(--r-text-secondary)] hover:text-[var(--r-text)] rounded transition-colors"
          aria-label="Close explorer"
        >
          <X size={13} />
        </button>
      </div>

      {explorerTab === "files" ? (
        <>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[10px] text-[var(--r-text-muted)]">{fileSearchQuery ? `${fileList.length}/${allFileNames.length}` : allFileNames.length} files</span>
            <button
              type="button"
              onClick={() => setShowNewFileInput(true)}
              className="p-1 text-[var(--r-text-secondary)] hover:text-[var(--r-text)] rounded transition-colors"
              aria-label="New file"
            >
              <FilePlus2 size={13} />
            </button>
          </div>

          <div className="px-2 pb-2">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--r-text-muted)]" />
              <input
                type="text"
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full pl-7 pr-2 py-1 bg-[var(--r-surface)] border border-[var(--r-border)] text-[11px] text-[var(--r-text)] placeholder-[#9DA5B0] rounded-md outline-none focus:border-[#0079f2] transition-colors"
              />
            </div>
          </div>

          {showNewFileInput && (
            <div className="px-2 pb-2">
              <form onSubmit={(e) => { e.preventDefault(); createFile(newFileName); }}>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="name.html / .css / .js"
                  className="w-full bg-[var(--r-surface)] text-[var(--r-text)] text-[11px] px-2 py-1.5 rounded-md border border-[#0079f2] outline-none font-mono"
                  autoFocus
                  onBlur={() => { setShowNewFileInput(false); setNewFileName(""); }}
                  onKeyDown={(e) => { if (e.key === "Escape") { setShowNewFileInput(false); setNewFileName(""); }}}
                />
              </form>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-1 py-1">
            {fileList.map((fileName) => {
              const info = getFileInfo(fileName);
              const Icon = info.icon;
              const isActive = activeFile === fileName;
              return (
                <div
                  key={fileName}
                  onClick={() => openFile(fileName)}
                  className={`group flex items-center gap-2 px-2 py-[5px] rounded-md text-[12px] cursor-pointer transition-colors mx-1 ${
                    isActive
                      ? "bg-[var(--r-accent-light)] text-[var(--r-text)]"
                      : "text-[var(--r-text-secondary)] hover:bg-[var(--r-surface-hover)]"
                  }`}
                >
                  <Icon size={14} className={info.color} />
                  <span className="truncate flex-1 font-mono">{fileName}</span>
                  {!["index.html", "style.css", "app.js"].includes(fileName) && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteFile(fileName); }}
                      className="opacity-0 group-hover:opacity-100 hover:text-[#f87171] transition-all p-0.5"
                      aria-label={`Delete ${fileName}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`mx-2 mt-2 border-2 border-dashed rounded-xl p-3 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-[#0079f2] bg-[#0079f2]/10"
                : "border-[var(--r-border)] hover:border-[#C8C8C4]"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  uploadFiles(e.target.files);
                  e.target.value = "";
                }
              }}
            />
            {uploading ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 size={14} className="animate-spin text-[#0079f2]" />
                <span className="text-[11px] text-[#0079f2]">Uploading...</span>
              </div>
            ) : (
              <>
                <Upload size={18} className="text-[var(--r-text-muted)] mx-auto mb-1" />
                <p className="text-[11px] text-[var(--r-text-secondary)]">Drop files or click to upload</p>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-1 py-2">
            {assets.length === 0 ? (
              <div className="text-center py-6">
                <ImageIcon size={24} className="text-[#E4E4E0] mx-auto mb-2" />
                <p className="text-[11px] text-[var(--r-text-muted)]">No assets yet</p>
              </div>
            ) : (
              assets.map((asset: AssetFile) => (
                <div
                  key={asset.url}
                  className="group flex items-center gap-2 px-2 py-[5px] rounded-md text-[12px] mx-1 hover:bg-[var(--r-surface-hover)] transition-colors"
                >
                  {asset.type.startsWith("image/") ? (
                    <div className="w-6 h-6 rounded overflow-hidden bg-[var(--r-sidebar)] flex items-center justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <ImageIcon size={14} className="text-[var(--r-text-secondary)] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[var(--r-text)] truncate font-mono">{asset.name}</div>
                    <div className="text-[9px] text-[var(--r-text-muted)]">{formatFileSize(asset.size)}</div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(asset.url)}
                      className="p-0.5 text-[var(--r-text-secondary)] hover:text-[#0079f2] rounded transition-colors"
                      title="Copy URL"
                    >
                      {copiedUrl === asset.url ? <Check size={11} className="text-[#00b894]" /> : <Copy size={11} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(asset.url)}
                      className="p-0.5 text-[var(--r-text-secondary)] hover:text-[#0079f2] rounded transition-colors"
                      title="Insert URL"
                    >
                      <Link size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAsset(asset.name)}
                      className="p-0.5 text-[var(--r-text-secondary)] hover:text-[#f87171] rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-3 py-2 border-t border-[var(--r-border)] text-[10px] text-[var(--r-text-muted)]">
            {assets.length} assets
          </div>
        </div>
      )}
    </div>
  );
}
