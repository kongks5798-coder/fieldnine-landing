"use client";

import { useRef, useState, useMemo, useCallback } from "react";
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
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
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

/* ===== Tree Types ===== */
interface TreeNode {
  name: string;
  fullPath: string;
  isFolder: boolean;
  children: TreeNode[];
}

function buildTree(fileNames: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const filePath of fileNames) {
    const parts = filePath.split("/");
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");

      let existing = currentLevel.find((n) => n.name === part && n.isFolder === !isFile);
      if (!existing) {
        existing = {
          name: part,
          fullPath: isFile ? filePath : fullPath,
          isFolder: !isFile,
          children: [],
        };
        currentLevel.push(existing);
      }
      currentLevel = existing.children;
    }
  }

  // Sort: folders first, then files, alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.isFolder) sortNodes(node.children);
    }
    return nodes;
  };

  return sortNodes(root);
}

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

/* ===== Tree Node Component ===== */
function FileTreeNode({
  node,
  depth,
  activeFile,
  openFile,
  deleteFile,
  expandedFolders,
  toggleFolder,
}: {
  node: TreeNode;
  depth: number;
  activeFile: string;
  openFile: (name: string) => void;
  deleteFile: (name: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
}) {
  const isExpanded = expandedFolders.has(node.fullPath);
  const isActive = !node.isFolder && activeFile === node.fullPath;
  const info = node.isFolder ? null : getFileInfo(node.name);
  const Icon = node.isFolder
    ? (isExpanded ? FolderOpen : Folder)
    : (info?.icon ?? FileText);
  const iconColor = node.isFolder ? "text-[#F59E0B]" : (info?.color ?? "text-[#858585]");
  const isProtected = ["index.html", "style.css", "data.js", "ui.js", "app.js"].includes(node.fullPath);

  return (
    <>
      <div
        onClick={() => node.isFolder ? toggleFolder(node.fullPath) : openFile(node.fullPath)}
        className={`group flex items-center gap-1.5 py-[4px] rounded-md text-[12px] cursor-pointer transition-colors mx-1 ${
          isActive
            ? "bg-[var(--r-accent-light)] text-[var(--r-text)]"
            : "text-[var(--r-text-secondary)] hover:bg-[var(--r-surface-hover)]"
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: "8px" }}
      >
        {node.isFolder && (
          <span className="shrink-0 w-3 flex items-center justify-center">
            {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </span>
        )}
        {!node.isFolder && <span className="w-3" />}
        <Icon size={14} className={iconColor} />
        <span className="truncate flex-1 font-mono">{node.name}</span>
        {!node.isFolder && !isProtected && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); deleteFile(node.fullPath); }}
            className="opacity-0 group-hover:opacity-100 hover:text-[#f87171] transition-all p-0.5"
            aria-label={`Delete ${node.name}`}
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
      {node.isFolder && isExpanded && node.children.map((child) => (
        <FileTreeNode
          key={child.fullPath}
          node={child}
          depth={depth + 1}
          activeFile={activeFile}
          openFile={openFile}
          deleteFile={deleteFile}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
        />
      ))}
    </>
  );
}

/* ===== Main Component ===== */
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const allFileNames = Object.keys(files);
  const fileList = fileSearchQuery
    ? allFileNames.filter((f) => f.toLowerCase().includes(fileSearchQuery.toLowerCase()))
    : allFileNames;

  // Check if any files have folder paths
  const hasFolders = allFileNames.some((f) => f.includes("/"));

  // Build tree from file list
  const tree = useMemo(() => buildTree(fileList), [fileList]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }, []);

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
                  placeholder="name.html or src/name.js"
                  className="w-full bg-[var(--r-surface)] text-[var(--r-text)] text-[11px] px-2 py-1.5 rounded-md border border-[#0079f2] outline-none font-mono"
                  autoFocus
                  onBlur={() => { setShowNewFileInput(false); setNewFileName(""); }}
                  onKeyDown={(e) => { if (e.key === "Escape") { setShowNewFileInput(false); setNewFileName(""); }}}
                />
              </form>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-1 py-1">
            {hasFolders || fileSearchQuery ? (
              /* Tree view when folders exist or searching */
              tree.map((node) => (
                <FileTreeNode
                  key={node.fullPath}
                  node={node}
                  depth={0}
                  activeFile={activeFile}
                  openFile={openFile}
                  deleteFile={deleteFile}
                  expandedFolders={expandedFolders}
                  toggleFolder={toggleFolder}
                />
              ))
            ) : (
              /* Flat list when no folders */
              fileList.map((fileName) => {
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
                    {!["index.html", "style.css", "data.js", "ui.js", "app.js"].includes(fileName) && (
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
              })
            )}
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
