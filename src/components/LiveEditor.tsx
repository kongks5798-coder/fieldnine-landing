"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Panel,
  Group,
  Separator,
  useDefaultLayout,
  usePanelRef,
} from "react-resizable-panels";
import {
  Play,
  RotateCcw,
  Monitor,
  Smartphone,
  Tablet,
  Maximize2,
  Minimize2,
  Terminal as TerminalIcon,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  FileCode2,
  Sparkles,
  Save,
  Check,
  Loader2,
  CloudOff,
  Rocket,
  Home,
  Globe,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  Download,
  Moon,
  Sun,
} from "lucide-react";
import AIChatPanel from "./AIChatPanel";
import FileExplorer, { getFileInfo, type VFile, type ExplorerTab } from "./FileExplorer";
import ConsolePanel, { type ConsoleLine, type ConsoleTab, type GitCommitEntry } from "./ConsolePanel";
import PreviewPanel from "./PreviewPanel";
import EditorTabs from "./EditorTabs";
import dynamic from "next/dynamic";

const CommandPalette = dynamic(() => import("./CommandPalette"), { ssr: false });
const DiffPreview = dynamic(() => import("./DiffPreview"), { ssr: false });
const CDNManager = dynamic(() => import("./CDNManager"), { ssr: false });
import { ToastContainer, useToast } from "./Toast";
import { useProjectSave } from "@/hooks/useProjectSave";
import { useAssets } from "@/hooks/useAssets";
import { useDeployStatus } from "@/hooks/useDeployStatus";
import { deployProject } from "@/lib/deploy";
import { createZip } from "@/lib/zipExport";
import { useTheme } from "@/lib/useTheme";
import { FileCog, FileText, Package } from "lucide-react";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { useWebContainer } from "@/hooks/useWebContainer";
import { isCodeComplete } from "@/lib/codeValidator";
import { ErrorBoundary } from "./providers";
import AIStatusIndicator from "./AIStatusIndicator";
import type { IDEAction } from "@/lib/ideActions";

const WebTerminal = dynamic(() => import("./WebTerminal"), { ssr: false });

/* ===== Default Project Files (modular JS architecture) ===== */
const DEFAULT_FILES: Record<string, VFile> = {
  "index.html": {
    name: "index.html",
    language: "html",
    content: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Field Nine OS — Infrastructure</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="app">
    <nav class="nav">
      <div class="nav-brand">
        <span class="logo">&#9889;</span>
        <span>Field Nine OS</span>
      </div>
      <div class="nav-right">
        <span class="global-dot" id="globalDot"></span>
        <button class="btn-refresh" id="refreshBtn" title="Refresh">&#8635;</button>
      </div>
    </nav>

    <header class="header">
      <h1>Infrastructure Status</h1>
      <p class="header-sub" id="lastUpdated">Loading...</p>
    </header>

    <section class="services" id="services">
      <div class="service-card skeleton-card" id="card-github">
        <div class="service-header">
          <span class="service-icon">GH</span>
          <span class="service-name">GitHub</span>
          <span class="service-badge" id="badge-github">...</span>
        </div>
        <div class="service-body" id="body-github">
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>
      </div>
      <div class="service-card skeleton-card" id="card-vercel">
        <div class="service-header">
          <span class="service-icon">VC</span>
          <span class="service-name">Vercel</span>
          <span class="service-badge" id="badge-vercel">...</span>
        </div>
        <div class="service-body" id="body-vercel">
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>
      </div>
      <div class="service-card skeleton-card" id="card-supabase">
        <div class="service-header">
          <span class="service-icon">SB</span>
          <span class="service-name">Supabase</span>
          <span class="service-badge" id="badge-supabase">...</span>
        </div>
        <div class="service-body" id="body-supabase">
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>
      </div>
    </section>

    <section class="commits-section" id="commitsSection">
      <h2 class="section-title">Recent Commits</h2>
      <div class="commits-list" id="commitsList">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    </section>

    <footer class="footer">
      <p>Built with <span class="heart">&#9829;</span> on Field Nine</p>
    </footer>
  </div>

  <script src="data.js"></script>
  <script src="ui.js"></script>
  <script src="app.js"></script>
</body>
</html>`,
    icon: FileCode2,
  },
  "style.css": {
    name: "style.css",
    language: "css",
    content: `/* === Field Nine OS — Infrastructure Dashboard === */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'Noto Sans KR', system-ui, sans-serif;
  background: #0a0a0a;
  color: #e2e8f0;
  min-height: 100vh;
}

.app { max-width: 960px; margin: 0 auto; padding: 0 24px; }

/* --- Nav --- */
.nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.nav-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; }
.logo { font-size: 24px; }
.nav-right { display: flex; align-items: center; gap: 12px; }

.global-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #475569;
  transition: background 0.3s;
}
.global-dot.ok { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.5); }
.global-dot.warn { background: #eab308; box-shadow: 0 0 8px rgba(234,179,8,0.5); }
.global-dot.error { background: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.5); }

.btn-refresh {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: #94a3b8; font-size: 18px; width: 36px; height: 36px;
  border-radius: 8px; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.btn-refresh:hover { background: rgba(255,255,255,0.1); color: #f1f5f9; }
.btn-refresh.spinning { animation: spin 0.8s linear infinite; }

/* --- Header --- */
.header { padding: 40px 0 24px; }
.header h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
.header-sub { font-size: 13px; color: #64748b; margin-top: 6px; }

/* --- Services Grid --- */
.services {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

@media (max-width: 700px) {
  .services { grid-template-columns: 1fr; }
}

.service-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s;
}
.service-card:hover {
  border-color: rgba(59,130,246,0.3);
  transform: translateY(-2px);
}

.service-header {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 16px;
}
.service-icon {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
  background: rgba(255,255,255,0.06); color: #94a3b8;
}
.service-name { font-weight: 600; font-size: 15px; flex: 1; }

.service-badge {
  padding: 3px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 600;
  background: rgba(255,255,255,0.06); color: #94a3b8;
}
.service-badge.ok { background: rgba(34,197,94,0.15); color: #4ade80; }
.service-badge.warn { background: rgba(234,179,8,0.15); color: #facc15; }
.service-badge.error { background: rgba(239,68,68,0.15); color: #f87171; }
.service-badge.offline { background: rgba(100,116,139,0.15); color: #94a3b8; }

.service-body { font-size: 13px; color: #94a3b8; }

.stat-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.stat-row:last-child { border-bottom: none; }
.stat-label { color: #64748b; }
.stat-value { color: #e2e8f0; font-weight: 500; }
.stat-value.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }

/* --- Commits Section --- */
.commits-section { margin-bottom: 40px; }
.section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }

.commits-list {
  border-left: 2px solid rgba(255,255,255,0.08);
  padding-left: 20px;
}

.commit-item {
  position: relative;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.commit-item:last-child { border-bottom: none; }
.commit-item::before {
  content: '';
  position: absolute; left: -25px; top: 18px;
  width: 8px; height: 8px; border-radius: 50%;
  background: #3b82f6;
}
.commit-msg { font-size: 14px; color: #e2e8f0; margin-bottom: 4px; }
.commit-meta { font-size: 12px; color: #64748b; }
.commit-sha {
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: #60a5fa; font-size: 12px;
}

/* --- Skeleton Loading --- */
.skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}
.skeleton-line { height: 14px; margin-bottom: 10px; }
.skeleton-line.short { width: 60%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes spin { 100% { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.fade-in { animation: fadeIn 0.3s ease-out; }

/* --- Error State --- */
.error-msg { color: #f87171; font-size: 13px; padding: 8px 0; }

/* --- Footer --- */
.footer {
  padding: 40px 0; border-top: 1px solid rgba(255,255,255,0.06);
  color: #475569; font-size: 14px; text-align: center;
}
.heart { color: #ef4444; }`,
    icon: FileText,
  },
  "data.js": {
    name: "data.js",
    language: "javascript",
    content: `// === Infrastructure Dashboard Configuration ===
window.INFRA_CONFIG = {
  apiUrl: '/api/infra-status',
  refreshIntervalMs: 60000,
  states: {
    ok:      { label: 'Operational', cls: 'ok' },
    warn:    { label: 'Degraded',    cls: 'warn' },
    error:   { label: 'Down',        cls: 'error' },
    offline: { label: 'Offline',     cls: 'offline' }
  }
};`,
    icon: FileCog,
  },
  "ui.js": {
    name: "ui.js",
    language: "javascript",
    content: `// === UI Helper Functions ===

window.timeAgo = function(dateStr) {
  var diff = Date.now() - new Date(dateStr).getTime();
  var sec = Math.floor(diff / 1000);
  if (sec < 60) return sec + 's ago';
  var min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  var hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  var d = Math.floor(hr / 24);
  return d + 'd ago';
};

window.formatDuration = function(ms) {
  if (!ms) return '-';
  var sec = Math.round(ms / 1000);
  if (sec < 60) return sec + 's';
  return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
};

window.setBadge = function(el, state) {
  var cfg = window.INFRA_CONFIG.states[state] || window.INFRA_CONFIG.states.offline;
  el.textContent = cfg.label;
  el.className = 'service-badge ' + cfg.cls;
};

window.renderGitHubCard = function(gh) {
  if (!gh || !gh.connected) {
    return '<div class="error-msg">' + (gh && gh.error ? gh.error : 'Not connected') + '</div>';
  }
  return '<div class="stat-row"><span class="stat-label">Repository</span><span class="stat-value mono">' + gh.repo + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Branch</span><span class="stat-value">' + gh.branch + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Last commit</span><span class="stat-value">' +
    (gh.recentCommits && gh.recentCommits[0] ? window.timeAgo(gh.recentCommits[0].date) : '-') + '</span></div>';
};

window.renderVercelCard = function(vc) {
  if (!vc || !vc.connected) {
    return '<div class="error-msg">' + (vc && vc.error ? vc.error : 'Not connected') + '</div>';
  }
  var statusText = vc.status || 'unknown';
  return '<div class="stat-row"><span class="stat-label">Status</span><span class="stat-value">' + statusText + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Build time</span><span class="stat-value">' + window.formatDuration(vc.buildDuration) + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Commit</span><span class="stat-value mono">' + (vc.commitSha || '-') + '</span></div>' +
    (vc.commitMessage ? '<div class="stat-row"><span class="stat-label">Message</span><span class="stat-value">' + vc.commitMessage.slice(0, 40) + '</span></div>' : '');
};

window.renderSupabaseCard = function(sb) {
  if (!sb || !sb.connected) {
    return '<div class="error-msg">' + (sb && sb.error ? sb.error : 'Not connected') + '</div>';
  }
  return '<div class="stat-row"><span class="stat-label">Response</span><span class="stat-value">' + sb.responseMs + 'ms</span></div>' +
    '<div class="stat-row"><span class="stat-label">Tables</span><span class="stat-value">' + sb.tablesCount + '</span></div>';
};

window.renderCommitsList = function(commits) {
  if (!commits || commits.length === 0) return '<div class="error-msg">No commits available</div>';
  return commits.map(function(c) {
    return '<div class="commit-item">' +
      '<div class="commit-msg">' + c.message + '</div>' +
      '<div class="commit-meta"><span class="commit-sha">' + c.sha + '</span> by ' + c.author + ' — ' + window.timeAgo(c.date) + '</div>' +
    '</div>';
  }).join('');
};`,
    icon: FileCog,
  },
  "app.js": {
    name: "app.js",
    language: "javascript",
    content: `// === Infrastructure Dashboard Entry Point ===
document.addEventListener('DOMContentLoaded', function() {
  var refreshBtn = document.getElementById('refreshBtn');
  var globalDot = document.getElementById('globalDot');
  var lastUpdated = document.getElementById('lastUpdated');
  var bodyGH = document.getElementById('body-github');
  var bodyVC = document.getElementById('body-vercel');
  var bodySB = document.getElementById('body-supabase');
  var badgeGH = document.getElementById('badge-github');
  var badgeVC = document.getElementById('badge-vercel');
  var badgeSB = document.getElementById('badge-supabase');
  var commitsList = document.getElementById('commitsList');
  var timer = null;

  function fetchStatus() {
    if (refreshBtn) refreshBtn.classList.add('spinning');

    fetch(window.INFRA_CONFIG.apiUrl)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (refreshBtn) refreshBtn.classList.remove('spinning');
        if (data.error) {
          showError(data.error);
          return;
        }

        // GitHub
        var ghState = data.github && data.github.connected ? 'ok' : 'error';
        if (badgeGH) window.setBadge(badgeGH, ghState);
        if (bodyGH) {
          bodyGH.innerHTML = window.renderGitHubCard(data.github);
          bodyGH.classList.add('fade-in');
        }

        // Vercel
        var vcState = 'error';
        if (data.vercel && data.vercel.connected) {
          vcState = data.vercel.status === 'READY' ? 'ok' : data.vercel.status === 'BUILDING' ? 'warn' : 'ok';
        }
        if (badgeVC) window.setBadge(badgeVC, vcState);
        if (bodyVC) {
          bodyVC.innerHTML = window.renderVercelCard(data.vercel);
          bodyVC.classList.add('fade-in');
        }

        // Supabase
        var sbState = data.supabase && data.supabase.connected ? 'ok' : 'error';
        if (data.supabase && data.supabase.connected && data.supabase.responseMs > 1000) sbState = 'warn';
        if (badgeSB) window.setBadge(badgeSB, sbState);
        if (bodySB) {
          bodySB.innerHTML = window.renderSupabaseCard(data.supabase);
          bodySB.classList.add('fade-in');
        }

        // Global dot
        var states = [ghState, vcState, sbState];
        var globalState = 'ok';
        if (states.indexOf('error') !== -1) globalState = 'error';
        else if (states.indexOf('warn') !== -1) globalState = 'warn';
        if (globalDot) globalDot.className = 'global-dot ' + globalState;

        // Commits
        if (commitsList && data.github && data.github.recentCommits) {
          commitsList.innerHTML = window.renderCommitsList(data.github.recentCommits);
          commitsList.classList.add('fade-in');
        }

        // Timestamp
        if (lastUpdated && data.timestamp) {
          lastUpdated.textContent = 'Updated ' + new Date(data.timestamp).toLocaleTimeString('ko-KR');
        }

        // Remove skeleton
        var skeletons = document.querySelectorAll('.skeleton-card');
        for (var i = 0; i < skeletons.length; i++) {
          skeletons[i].classList.remove('skeleton-card');
        }
      })
      .catch(function(err) {
        if (refreshBtn) refreshBtn.classList.remove('spinning');
        showError('Connection failed: ' + err.message);
      });
  }

  function showError(msg) {
    if (globalDot) globalDot.className = 'global-dot error';
    if (lastUpdated) lastUpdated.textContent = msg;
    if (badgeGH) window.setBadge(badgeGH, 'offline');
    if (badgeVC) window.setBadge(badgeVC, 'offline');
    if (badgeSB) window.setBadge(badgeSB, 'offline');
  }

  // Manual refresh
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      fetchStatus();
    });
  }

  // Initial fetch
  fetchStatus();

  // Auto-refresh
  timer = setInterval(fetchStatus, window.INFRA_CONFIG.refreshIntervalMs);

  console.log('Field Nine OS: Infrastructure Dashboard loaded');
});`,
    icon: FileCog,
  },
};

type ViewportSize = "desktop" | "tablet" | "mobile";
type EditorTheme = "vs-dark" | "light" | "hc-black";

/* ===== Main Component ===== */
interface LiveEditorProps {
  initialPrompt?: string;
  projectSlug: string | null;
  onGoHome?: () => void;
}

export default function LiveEditor({ initialPrompt, projectSlug, onGoHome }: LiveEditorProps) {
  const { resolved: theme, toggle: toggleTheme } = useTheme();
  const [files, setFiles] = useState<Record<string, VFile>>(() =>
    JSON.parse(JSON.stringify(DEFAULT_FILES))
  );
  const [activeFile, setActiveFile] = useState("index.html");
  const [openTabs, setOpenTabs] = useState(["index.html", "style.css", "data.js", "ui.js", "app.js"]);
  const [renderedHTML, setRenderedHTML] = useState("");
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [editorTheme] = useState<EditorTheme>("vs-dark");
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<"editor" | "preview" | "ai" | "console">("editor");
  const [isMobile, setIsMobile] = useState(false);
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("console");
  const [consoleFilter, setConsoleFilter] = useState<ConsoleLine["type"] | "all">("all");
  const [shellInput, setShellInput] = useState("");
  const [shellHistory, setShellHistory] = useState<string[]>([
    "$ npm install",
    "added 0 packages in 0.3s",
    "$ npm start",
    "Server running on port 3000",
  ]);
  const [deployStatus, setDeployStatus] = useState<"idle" | "deploying" | "deployed">("idle");
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [explorerTab, setExplorerTab] = useState<ExplorerTab>("files");
  const [gitHistory, setGitHistory] = useState<GitCommitEntry[]>([]);
  const [gitLoading, setGitLoading] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [cdnManagerOpen, setCdnManagerOpen] = useState(false);
  const [inspectorMode, setInspectorMode] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [splitFile, setSplitFile] = useState("style.css");
  const [aiFixMessage, setAIFixMessage] = useState<string | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSynced, setShowSynced] = useState(false);
  const [autoTestActive, setAutoTestActive] = useState(false);
  const [autoTestCompleted, setAutoTestCompleted] = useState(false);
  const [errorFixState, setErrorFixState] = useState<{ message: string; phase: "detecting" | "fixing" | "done" } | null>(null);
  const errorFixCooldownRef = useRef(false);
  const lastErrorMsgRef = useRef<string>("");
  const errorRetryCountRef = useRef(0);
  const syncDoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ===== AI IDE Action State ===== */
  const [currentIDEAction, setCurrentIDEAction] = useState<IDEAction | null>(null);
  const ideActionCounter = useRef(0);

  /* ===== WebContainer Runtime ===== */
  const {
    status: wcStatus,
    boot: wcBoot,
    writeFiles: wcWriteFiles,
    serverUrl: wcServerUrl,
    shellProcess: wcShellProcess,
    startShell: wcStartShell,
    runCommand: wcRunCommand,
  } = useWebContainer();
  const [wcEnabled, setWcEnabled] = useState(false);
  const wcSyncRef = useRef(false);

  // Boot WebContainer when enabled
  useEffect(() => {
    if (wcEnabled && wcStatus === "idle") {
      wcBoot();
    }
  }, [wcEnabled, wcStatus, wcBoot]);

  // Start shell when WebContainer is ready
  useEffect(() => {
    if (wcStatus === "ready" && !wcShellProcess) {
      wcStartShell();
    }
  }, [wcStatus, wcShellProcess, wcStartShell]);

  // Sync files to WebContainer when ready
  useEffect(() => {
    if (wcStatus !== "ready" || wcSyncRef.current) return;
    wcSyncRef.current = true;
    const flatFiles: Record<string, string> = {};
    for (const [name, f] of Object.entries(files)) {
      flatFiles[name] = f.content;
    }
    wcWriteFiles(flatFiles);
  }, [wcStatus, files, wcWriteFiles]);

  /* ===== Diff Preview State ===== */
  const [diffPreview, setDiffPreview] = useState<{ fileName: string; oldCode: string; newCode: string } | null>(null);

  /* ===== Undo History (extracted hook) ===== */
  const { pushUndoSnapshot, undoFile, redoFile } = useUndoHistory();

  /* ===== Toast ===== */
  const { toasts, addToast, dismissToast, updateToast } = useToast();

  /* ===== Project Save Hook ===== */
  const { saveStatus, triggerAutoSave, manualSave, loadFromStorage, clearLocalStorage } =
    useProjectSave(getFileInfo, projectSlug);

  /* ===== Assets Hook ===== */
  const { assets, uploading, loadAssets, uploadFiles, deleteAsset } =
    useAssets(projectSlug);

  /* ===== Deploy Status Hook (Vercel real-time) ===== */
  const {
    deployState: vercelState,
    deployUrl: vercelUrl,
    commitMessage: vercelCommitMsg,
    isPolling: vercelPolling,
    startPolling: startVercelPolling,
  } = useDeployStatus(true);

  /* ===== Shadow Commit Handler (passed to AIChatPanel) ===== */
  const handleShadowCommit = useCallback(
    async (fileChanges: { path: string; content: string }[], commitMsg: string): Promise<boolean> => {
      // Completeness guard: block truncated code from reaching GitHub
      for (const file of fileChanges) {
        const ext = file.path.split(".").pop()?.toLowerCase() ?? "";
        const lang = ext === "js" || ext === "mjs" ? "javascript" : ext === "ts" || ext === "tsx" ? "typescript" : ext;
        const check = isCodeComplete(file.content, lang);
        if (!check.complete) {
          console.warn(`[shadow-commit] BLOCKED: ${file.path} is truncated — ${check.reason}`);
          return false;
        }
      }
      try {
        const res = await fetch("/api/save-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: fileChanges, message: commitMsg }),
        });
        const data = await res.json();
        if (data.success) {
          startVercelPolling();
          setAutoTestActive(true);
          return true;
        }
        return false;
      } catch (e) {
        console.error("[LiveEditor] shadow commit failed:", e);
        return false;
      }
    },
    [startVercelPolling],
  );

  const handleAutoTestComplete = useCallback(() => {
    setAutoTestActive(false);
    setAutoTestCompleted(true);
  }, []);

  const handleAutoTestReportShown = useCallback(() => {
    setAutoTestCompleted(false);
  }, []);

  /* ===== Auto Shadow Commit on code edits (10s debounce) ===== */
  const shadowCommitDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerAutoCommit = useCallback(
    (files: Record<string, VFile>) => {
      if (shadowCommitDebounceRef.current) clearTimeout(shadowCommitDebounceRef.current);
      shadowCommitDebounceRef.current = setTimeout(() => {
        // Client-side completeness guard: skip commit if any file is truncated
        for (const [name, f] of Object.entries(files)) {
          const check = isCodeComplete(f.content, f.language);
          if (!check.complete) {
            console.warn(`[auto-commit] BLOCKED: ${name} is truncated — ${check.reason}`);
            return;
          }
        }
        const fileChanges = Object.entries(files).map(([name, f]) => ({
          path: name,
          content: f.content,
        }));
        // Fire-and-forget: don't block UI waiting for commit
        handleShadowCommit(fileChanges, "chore: auto-save code changes").catch(() => {});
      }, 5_000);
    },
    [handleShadowCommit],
  );

  /* ===== Fetch Git History ===== */
  const fetchGitHistory = useCallback(async () => {
    setGitLoading(true);
    try {
      const res = await fetch("/api/git-history?per_page=50");
      const data = await res.json();
      setGitHistory(data.commits ?? []);
    } catch {
      setGitHistory([]);
    } finally {
      setGitLoading(false);
    }
  }, []);

  /* ===== Restore files from a git commit ===== */
  const [restoringCommit, setRestoringCommit] = useState<string | null>(null);
  const handleGitRestore = useCallback(async (fullSha: string) => {
    setRestoringCommit(fullSha);
    try {
      const res = await fetch(`/api/git-restore?sha=${fullSha}`);
      const data = await res.json();
      if (!res.ok || !data.files) throw new Error(data.error || "Restore failed");

      const restoredFiles: Record<string, VFile> = {};
      for (const [name, content] of Object.entries(data.files as Record<string, string>)) {
        const info = getFileInfo(name);
        restoredFiles[name] = { name, language: info.language, content, icon: info.icon };
      }
      setFiles((prev) => {
        const merged = { ...prev, ...restoredFiles };
        triggerAutoSave(merged);
        return merged;
      });
      setOpenTabs((prev) => {
        const newTabs = [...prev];
        for (const name of Object.keys(restoredFiles)) {
          if (!newTabs.includes(name)) newTabs.push(name);
        }
        return newTabs;
      });
      addToast({ type: "success", message: `커밋 ${data.sha}로 복원 완료` });
    } catch (err) {
      addToast({ type: "error", message: `복원 실패: ${(err as Error).message}` });
    } finally {
      setRestoringCommit(null);
    }
  }, [triggerAutoSave, addToast]);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const autoRunRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Panel refs
  const aiPanelRef = usePanelRef();
  const consolePanelRef = usePanelRef();
  const previewPanelRef = usePanelRef();

  const horizontalLayout = useDefaultLayout({ id: "replit-h" });
  const verticalLayout = useDefaultLayout({ id: "replit-v" });

  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);

  /* ===== Mobile detection ===== */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
      if (e.matches) setShowFileExplorer(false);
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ===== Auto-open AI panel when initial prompt is present ===== */
  useEffect(() => {
    if (!initialPrompt) return;
    if (isMobile) {
      setMobilePanel("ai");
    } else {
      aiPanelRef.current?.expand();
    }
  }, [initialPrompt, isMobile]);

  /* ===== Load saved project on mount ===== */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildPreviewRef = useRef<(() => string) | null>(null);

  useEffect(() => {
    const REQUIRED_FILES = ["index.html", "style.css", "data.js", "ui.js", "app.js"];
    const defaults = JSON.parse(JSON.stringify(DEFAULT_FILES)) as Record<string, VFile>;

    loadFromStorage()
      .then((loaded) => {
        if (loaded) {
          const htmlContent = loaded["index.html"]?.content ?? "";
          if (htmlContent.trim().length > 10) {
            // Patch missing required files from defaults
            for (const fname of REQUIRED_FILES) {
              if (!loaded[fname] || !loaded[fname].content || loaded[fname].content.trim().length < 5) {
                console.warn(`[LiveEditor] Missing/empty ${fname}, patching from defaults`);
                loaded[fname] = defaults[fname];
              }
            }
            // Truncation guard: if any JS file has unclosed braces, replace it
            for (const fname of ["data.js", "ui.js", "app.js"]) {
              const code = loaded[fname]?.content ?? "";
              const opens = (code.match(/\{/g) || []).length;
              const closes = (code.match(/\}/g) || []).length;
              if (opens !== closes) {
                console.warn(`[LiveEditor] Truncated ${fname} detected (braces ${opens}/${closes}), resetting`);
                loaded[fname] = defaults[fname];
              }
            }
            setFiles(loaded);
            setOpenTabs(Object.keys(loaded));
            setActiveFile(Object.keys(loaded)[0] ?? "index.html");
          } else {
            console.warn("[LiveEditor] Loaded files invalid (empty index.html), using defaults");
          }
        }
      })
      .catch((err) => {
        console.error("[LiveEditor] loadFromStorage failed, using defaults:", err);
      })
      .finally(() => {
        // Always force preview render — even on error, defaults are in state
        setTimeout(() => {
          if (buildPreviewRef.current) setRenderedHTML(buildPreviewRef.current());
        }, 150);
      });
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Build combined HTML ===== */
  const buildPreview = useCallback(() => {
    const html = files["index.html"]?.content ?? "";

    const consoleCapture = `
      <script>
        (function() {
          // CSS Hot Inject listener
          window.addEventListener('message', function(e) {
            if (e.data && e.data.source === 'fn-hot-css') {
              var style = document.getElementById('fn-hot-style');
              if (style) { style.textContent = e.data.css; }
            }
          });
          const _post = (type, args) => {
            try {
              window.parent.postMessage({
                source: 'fn-preview',
                type: type,
                text: Array.from(args).map(a =>
                  typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
                ).join(' ')
              }, '*');
            } catch(e) {}
          };
          const _orig = { log: console.log, error: console.error, warn: console.warn, info: console.info };
          console.log = function() { _orig.log.apply(console, arguments); _post('log', arguments); };
          console.error = function() { _orig.error.apply(console, arguments); _post('error', arguments); };
          console.warn = function() { _orig.warn.apply(console, arguments); _post('warn', arguments); };
          console.info = function() { _orig.info.apply(console, arguments); _post('info', arguments); };
          window.onerror = function(msg, url, line) {
            _post('error', ['Error: ' + msg + ' (line ' + line + ')']);
          };
          window.onunhandledrejection = function(e) {
            _post('error', ['Unhandled Promise: ' + (e.reason || e)]);
          };
        })();
      </script>
    `;

    let combined = html;

    // Dynamic CSS: replace ALL <link rel="stylesheet" href="*.css"> with inline <style>
    combined = combined.replace(
      /<link\s+rel="stylesheet"\s+href="([^"]+\.css)"\s*\/?>/gi,
      (_match: string, fileName: string) => {
        const content = files[fileName]?.content ?? "";
        const idAttr = fileName === "style.css" ? ' id="fn-hot-style"' : "";
        return `<style${idAttr}>${content}</style>`;
      },
    );

    // Dynamic JS: replace ALL <script src="*.js"> with inline <script>
    combined = combined.replace(
      /<script\s+[^>]*src="([^"]+\.js)"[^>]*><\/script>/gi,
      (_match: string, fileName: string) => {
        const content = files[fileName]?.content ?? "";
        return `<script>try{${content}}catch(e){console.error('${fileName} runtime error:',e.message)}</script>`;
      },
    );

    const headIdx = combined.indexOf("<head>");
    if (headIdx !== -1) {
      combined = combined.slice(0, headIdx + 6) + consoleCapture + combined.slice(headIdx + 6);
    } else {
      combined = consoleCapture + combined;
    }

    // Safety: never return empty — ensures preview always renders
    if (!combined || combined.trim().length < 10) {
      return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap"/><style>body{display:flex;align-items:center;justify-content:center;height:100vh;font-family:'Inter','Noto Sans KR',sans-serif;color:#64748b;}</style></head><body><p>프리뷰 준비 중...</p></body></html>`;
    }
    return combined;
  }, [files]);

  /* ===== Inspector-aware preview (injects element picker script) ===== */
  const previewHTML = useMemo(() => {
    if (!inspectorMode) return renderedHTML;
    const inspectorScript = `<script>(function(){
if(window.__f9Ins)return;window.__f9Ins=1;
var ov=document.createElement('div');ov.style.cssText='position:fixed;pointer-events:none;z-index:99999;border:2px solid #0079F2;background:rgba(0,121,242,0.08);transition:all .1s;display:none;';
document.body.appendChild(ov);
var lb=document.createElement('div');lb.style.cssText='position:fixed;z-index:100000;pointer-events:none;background:#0079F2;color:#fff;font:10px/1 monospace;padding:2px 6px;border-radius:3px;display:none;';
document.body.appendChild(lb);
document.addEventListener('mousemove',function(e){var el=document.elementFromPoint(e.clientX,e.clientY);if(!el||el===ov||el===lb)return;var r=el.getBoundingClientRect();ov.style.display='block';ov.style.left=r.left+'px';ov.style.top=r.top+'px';ov.style.width=r.width+'px';ov.style.height=r.height+'px';lb.style.display='block';lb.style.left=r.left+'px';lb.style.top=Math.max(0,r.top-18)+'px';lb.textContent=el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.className?'.'+String(el.className).trim().split(/\\s+/).join('.'):'');});
document.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var el=e.target;window.parent.postMessage({source:'f9-inspector',tag:el.tagName.toLowerCase(),id:el.id||'',classes:String(el.className||''),text:(el.textContent||'').slice(0,80)},'*');},true);
})();</script>`;
    return renderedHTML.replace("</body>", inspectorScript + "</body>");
  }, [renderedHTML, inspectorMode]);

  /* ===== Console + Inspector messages from iframe ===== */
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.source === "fn-preview") {
        const now = new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        });
        setConsoleLines((prev) => [
          ...prev.slice(-50),
          { type: e.data.type, text: e.data.text, time: now },
        ]);

        // Virtual Error Detector: detects errors and triggers AI auto-fix
        // Cooldown resets after each cycle so new/different errors can be caught
        // Same error repeating 3+ times → stop (prevents infinite loops)
        if (e.data.type === "error" && !errorFixCooldownRef.current) {
          const errText = String(e.data.text).slice(0, 120);

          // Same error repeating? Increment counter. Different error? Reset.
          if (errText === lastErrorMsgRef.current) {
            errorRetryCountRef.current += 1;
          } else {
            errorRetryCountRef.current = 1;
            lastErrorMsgRef.current = errText;
          }

          // Stop after 3 retries on the same error (infinite loop guard)
          if (errorRetryCountRef.current > 3) return;

          errorFixCooldownRef.current = true;
          setErrorFixState({ message: errText, phase: "detecting" });

          setTimeout(() => {
            setErrorFixState((prev) => prev ? { ...prev, phase: "done" } : null);
          }, 1500);

          setTimeout(() => {
            setErrorFixState(null);
            // Reset cooldown so new errors can be detected
            errorFixCooldownRef.current = false;
          }, 5000);
        }
      }
      // Inspector element click → navigate to code
      if (e.data?.source === "f9-inspector") {
        const { tag, id, classes, text } = e.data;
        // Search for the element in HTML files
        const htmlContent = files["index.html"]?.content ?? "";
        const searchTerms = [
          id ? `id="${id}"` : null,
          classes ? `class="${classes}"` : null,
          text ? text.slice(0, 30) : null,
          `<${tag}`,
        ].filter(Boolean) as string[];
        for (const term of searchTerms) {
          const idx = htmlContent.indexOf(term);
          if (idx !== -1) {
            setActiveFile("index.html");
            if (!openTabs.includes("index.html")) setOpenTabs((prev) => [...prev, "index.html"]);
            break;
          }
        }
        setInspectorMode(false);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [files, openTabs, buildPreview]);

  /* ===== CSS Hot Inject via postMessage ===== */
  const hotInjectCSS = useCallback((css: string) => {
    try {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return false;
      iframe.contentWindow.postMessage({ source: "fn-hot-css", css }, "*");
      return true;
    } catch {
      return false;
    }
  }, []);

  /* ===== Auto-run on code change ===== */
  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newContent = value ?? "";
      // Push undo snapshot (debounced — only on meaningful changes)
      pushUndoSnapshot(activeFile, newContent);

      setFiles((prev) => {
        if (!prev[activeFile]) return prev;
        const next = { ...prev, [activeFile]: { ...prev[activeFile], content: newContent } };
        triggerAutoSave(next);
        triggerAutoCommit(next);
        return next;
      });

      // CSS Hot Inject: skip full reload for style.css edits (hot-injected via fn-hot-style id)
      if (activeFile === "style.css") {
        if (hotInjectCSS(newContent)) return;
      }

      setIsSyncing(true);
      if (autoRunRef.current) clearTimeout(autoRunRef.current);
      autoRunRef.current = setTimeout(() => {
        setConsoleLines([]);
        setRenderedHTML(buildPreview());
        setIsSyncing(false);
        setShowSynced(true);
        if (syncDoneTimerRef.current) clearTimeout(syncDoneTimerRef.current);
        syncDoneTimerRef.current = setTimeout(() => setShowSynced(false), 800);
      }, 300);
    },
    [activeFile, buildPreview, triggerAutoSave, triggerAutoCommit, hotInjectCSS, pushUndoSnapshot]
  );

  // Keep buildPreview ref in sync for deferred calls
  buildPreviewRef.current = buildPreview;

  useEffect(() => {
    setRenderedHTML(buildPreview());
  }, [buildPreview]);

  const handleRun = useCallback(() => {
    setConsoleLines([]);
    setRenderedHTML(buildPreview());
  }, [buildPreview]);

  const handleReset = useCallback(() => {
    const fresh = JSON.parse(JSON.stringify(DEFAULT_FILES));
    setFiles(fresh);
    setActiveFile("index.html");
    setOpenTabs(Object.keys(fresh));
    setConsoleLines([]);
    clearLocalStorage();
    // Use buildPreviewRef so console capture and all injection logic is included
    setTimeout(() => {
      if (buildPreviewRef.current) setRenderedHTML(buildPreviewRef.current());
    }, 50);
  }, [clearLocalStorage]);

  /* ===== File CRUD ===== */
  const VALID_EXTENSIONS = /\.(html|htm|css|js|ts|json|md|txt|svg|xml)$/i;
  const createFile = useCallback((name: string) => {
    // Allow forward slashes for folder paths, block unsafe patterns
    if (!name || files[name] || !VALID_EXTENSIONS.test(name)) return;
    if (name.includes("..") || name.includes("\\") || name.startsWith("/")) return;
    const info = getFileInfo(name);
    setFiles((prev) => {
      const next = { ...prev, [name]: { name, language: info.language, content: `/* ${name} */\n`, icon: info.icon } };
      triggerAutoSave(next);
      return next;
    });
    setOpenTabs((prev) => [...prev, name]);
    setActiveFile(name);
    setShowNewFileInput(false);
    setNewFileName("");
  }, [files, triggerAutoSave]);

  const deleteFile = useCallback((name: string) => {
    if (Object.keys(files).length <= 1) return;
    setFiles((prev) => {
      const next = { ...prev };
      delete next[name];
      triggerAutoSave(next);
      return next;
    });
    setOpenTabs((prev) => prev.filter((t) => t !== name));
    if (activeFile === name) {
      const remaining = Object.keys(files).filter((f) => f !== name);
      setActiveFile(remaining[0]);
    }
  }, [files, activeFile, triggerAutoSave]);

  /* ===== AI Code Insertion (with optional diff preview) ===== */
  const applyCodeDirect = useCallback((code: string, targetFile: string) => {
    // Guard: never insert empty content
    if (!code || code.trim().length === 0) {
      console.warn(`[applyCodeDirect] Blocked empty code for ${targetFile}`);
      return;
    }
    pushUndoSnapshot(targetFile, code);
    setFiles((prev) => {
      const existing = prev[targetFile];
      const info = getFileInfo(targetFile);
      const next = {
        ...prev,
        [targetFile]: {
          name: targetFile,
          language: info.language,
          content: code,
          icon: existing?.icon ?? info.icon,
        },
      };
      triggerAutoSave(next);
      triggerAutoCommit(next);
      return next;
    });
    if (!openTabs.includes(targetFile)) setOpenTabs((prev) => [...prev, targetFile]);
    setActiveFile(targetFile);

    // CSS hot inject: skip full reload for style.css (instant visual update)
    if (targetFile === "style.css") {
      hotInjectCSS(code);
      return;
    }

    // Debounced preview rebuild: batch multiple rapid AI insertions into one rebuild
    if (autoRunRef.current) clearTimeout(autoRunRef.current);
    autoRunRef.current = setTimeout(() => {
      if (buildPreviewRef.current) {
        setConsoleLines([]);
        setRenderedHTML(buildPreviewRef.current());
      }
    }, 150);
  }, [openTabs, triggerAutoSave, triggerAutoCommit, pushUndoSnapshot, hotInjectCSS]);

  // Pending diff insertion (stored for accept/reject)
  const pendingInsertRef = useRef<{ code: string; targetFile: string } | null>(null);

  const handleInsertCode = useCallback((code: string, targetFile: string, auto?: boolean) => {
    // Truncation warning: check completeness before inserting AI code
    const ext = targetFile.split(".").pop()?.toLowerCase() ?? "";
    const lang = ext === "js" || ext === "mjs" ? "javascript" : ext === "ts" || ext === "tsx" ? "typescript" : ext;
    const check = isCodeComplete(code, lang);
    if (!check.complete) {
      addToast({ type: "error", message: `AI 코드 잘림 감지: ${targetFile} (${check.reason}) — 커밋 차단됨` });
      console.warn(`[insert-code] Truncated AI output for ${targetFile}: ${check.reason}`);
      // Still insert so user can see & fix, but auto-commit won't fire (guard in triggerAutoCommit)
    }

    // Auto mode (AI streaming/auto-insert): always apply directly, skip diff preview
    if (auto) {
      applyCodeDirect(code, targetFile);
      return;
    }
    const existing = files[targetFile];
    // Manual insert: show diff if file exists and has meaningful content
    if (existing && existing.content.trim().length > 10 && existing.content !== code) {
      pendingInsertRef.current = { code, targetFile };
      setDiffPreview({ fileName: targetFile, oldCode: existing.content, newCode: code });
    } else {
      applyCodeDirect(code, targetFile);
    }
  }, [files, applyCodeDirect, addToast]);

  const handleDiffAccept = useCallback(() => {
    if (pendingInsertRef.current) {
      applyCodeDirect(pendingInsertRef.current.code, pendingInsertRef.current.targetFile);
      pendingInsertRef.current = null;
    }
    setDiffPreview(null);
  }, [applyCodeDirect]);

  const handleDiffReject = useCallback(() => {
    pendingInsertRef.current = null;
    setDiffPreview(null);
  }, []);

  /* ===== Split Editor Code Change ===== */
  const handleSplitCodeChange = useCallback(
    (value: string | undefined) => {
      const newContent = value ?? "";
      pushUndoSnapshot(splitFile, newContent);
      setFiles((prev) => {
        if (!prev[splitFile]) return prev;
        const next = { ...prev, [splitFile]: { ...prev[splitFile], content: newContent } };
        triggerAutoSave(next);
        triggerAutoCommit(next);
        return next;
      });
      if (splitFile === "style.css") {
        if (hotInjectCSS(newContent)) return;
      }
      if (autoRunRef.current) clearTimeout(autoRunRef.current);
      autoRunRef.current = setTimeout(() => {
        setConsoleLines([]);
        setRenderedHTML(buildPreview());
      }, 300);
    },
    [splitFile, buildPreview, triggerAutoSave, triggerAutoCommit, hotInjectCSS, pushUndoSnapshot]
  );

  /* ===== AI Fix Handler ===== */
  const handleAIFix = useCallback((errorText: string) => {
    setAIFixMessage(`다음 콘솔 에러를 분석하고 수정 코드를 생성해줘:\n\n\`\`\`\n${errorText}\n\`\`\``);
  }, []);

  /* ===== CDN Tag Insertion ===== */
  const handleCDNInsert = useCallback((tag: string) => {
    setFiles((prev) => {
      const html = prev["index.html"];
      if (!html) return prev;
      let content = html.content;
      // Insert before </head>
      const headClose = content.indexOf("</head>");
      if (headClose !== -1) {
        content = content.slice(0, headClose) + "  " + tag + "\n" + content.slice(headClose);
      } else {
        // Fallback: prepend
        content = tag + "\n" + content;
      }
      pushUndoSnapshot("index.html", content);
      const next = { ...prev, "index.html": { ...html, content } };
      triggerAutoSave(next);
      return next;
    });
    // Rebuild preview
    setTimeout(() => {
      setConsoleLines([]);
      setRenderedHTML(buildPreview());
    }, 100);
  }, [buildPreview, triggerAutoSave, pushUndoSnapshot]);

  /* ===== Download as ZIP ===== */
  const handleDownload = useCallback(() => {
    const entries = Object.entries(files).map(([name, f]) => ({ name, content: f.content }));
    const blob = createZip(entries);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectSlug || "fieldnine-project"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [files, projectSlug]);

  /* ===== Real Deploy ===== */
  const handleDeploy = useCallback(async () => {
    if (!projectSlug) return;
    // Pre-deploy completeness check
    for (const [name, f] of Object.entries(files)) {
      const check = isCodeComplete(f.content, f.language);
      if (!check.complete) {
        addToast({ type: "error", message: `배포 차단: ${name} 코드가 잘려있음 (${check.reason})` });
        return;
      }
    }
    setDeployStatus("deploying");
    const toastId = addToast({ type: "loading", message: "배포 중..." });
    try {
      await manualSave(files);
      const fileChanges = Object.entries(files).map(([name, f]) => ({
        path: name,
        content: f.content,
      }));
      await handleShadowCommit(fileChanges, `deploy: ${projectSlug}`);
      const combinedHTML = buildPreview();
      const url = await deployProject(projectSlug, combinedHTML);

      if (url) {
        setDeployedUrl(url);
        setDeployStatus("deployed");
        updateToast(toastId, { type: "success", message: "배포 완료!", url });
        setTimeout(() => setDeployStatus("idle"), 8000);
      } else {
        setDeployStatus("idle");
        updateToast(toastId, { type: "error", message: "배포 실패 — 다시 시도해주세요" });
      }
    } catch (err) {
      setDeployStatus("idle");
      updateToast(toastId, { type: "error", message: `배포 오류: ${(err as Error).message}` });
    }
  }, [files, projectSlug, manualSave, buildPreview, handleShadowCommit, addToast, updateToast]);

  /* ===== Shell commands ===== */
  const handleShellSubmit = useCallback(async (cmd: string) => {
    if (!cmd.trim()) return;
    setShellHistory((prev) => [...prev, `$ ${cmd}`]);
    setShellInput("");

    // If WebContainer is active, run real commands
    if (wcEnabled && wcStatus === "ready") {
      try {
        const lower = cmd.toLowerCase().trim();
        if (lower === "clear") {
          setShellHistory([]);
          return;
        }
        // Sync current files before running
        const flatFiles: Record<string, string> = {};
        for (const [name, f] of Object.entries(files)) {
          flatFiles[name] = f.content;
        }
        await wcWriteFiles(flatFiles);

        const output = await wcRunCommand(cmd);
        if (output.trim()) {
          setShellHistory((prev) => [...prev, ...output.trim().split("\n")]);
        }
      } catch (err) {
        setShellHistory((prev) => [...prev, `Error: ${err instanceof Error ? err.message : String(err)}`]);
      }
      return;
    }

    // Fallback: simulated shell
    const lower = cmd.toLowerCase().trim();
    if (lower === "ls") {
      setShellHistory((prev) => [...prev, Object.keys(files).join("  ")]);
    } else if (lower === "clear") {
      setShellHistory([]);
    } else if (lower.startsWith("echo ")) {
      setShellHistory((prev) => [...prev, cmd.slice(5)]);
    } else if (lower === "pwd") {
      setShellHistory((prev) => [...prev, "/home/user/project"]);
    } else if (lower === "node -v") {
      setShellHistory((prev) => [...prev, "v20.11.0 (simulated)"]);
    } else if (lower === "npm -v") {
      setShellHistory((prev) => [...prev, "10.2.4 (simulated)"]);
    } else if (lower === "help") {
      setShellHistory((prev) => [...prev, "Enable WebContainer for real Node.js runtime. Commands: ls, pwd, echo, clear, help"]);
    } else {
      setShellHistory((prev) => [...prev, `bash: ${cmd}: command not found (enable WebContainer for real runtime)`]);
    }
  }, [files, wcEnabled, wcStatus, wcWriteFiles, wcRunCommand]);

  const handleTabClick = (fileName: string) => {
    setActiveFile(fileName);
    if (autoRunRef.current) clearTimeout(autoRunRef.current);
    setRenderedHTML(buildPreview());
  };

  const handleTabClose = (fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t !== fileName);
    if (newTabs.length === 0) return;
    setOpenTabs(newTabs);
    if (activeFile === fileName) setActiveFile(newTabs[newTabs.length - 1]);
  };

  const openFile = (fileName: string) => {
    if (!openTabs.includes(fileName)) setOpenTabs([...openTabs, fileName]);
    setActiveFile(fileName);
    setRenderedHTML(buildPreview());
  };

  const toggleConsole = useCallback(() => {
    const panel = consolePanelRef.current;
    if (!panel) return;
    if (consoleCollapsed) panel.expand(); else panel.collapse();
  }, [consoleCollapsed]);

  const toggleAiPanel = useCallback(() => {
    const panel = aiPanelRef.current;
    if (!panel) return;
    if (aiCollapsed) panel.expand(); else panel.collapse();
  }, [aiCollapsed]);

  /* ===== IDE Action Dispatcher (AI → IDE control) ===== */
  const handleIDEAction = useCallback((action: IDEAction) => {
    ideActionCounter.current += 1;
    setCurrentIDEAction({ ...action });

    switch (action.type) {
      case "switch-file":
        if (files[action.file]) {
          if (!openTabs.includes(action.file)) setOpenTabs((prev) => [...prev, action.file]);
          setActiveFile(action.file);
        }
        break;
      case "create-file":
        createFile(action.name);
        break;
      case "delete-file":
        deleteFile(action.name);
        break;
      case "set-viewport":
        setViewport(action.size);
        break;
      case "toggle-file-explorer":
        setShowFileExplorer((v) => !v);
        break;
      case "toggle-console":
        toggleConsole();
        break;
      case "refresh-preview":
        handleRun();
        break;
      case "deploy":
        handleDeploy();
        break;
      case "set-theme":
        if ((action.theme === "dark") !== (theme === "dark")) toggleTheme();
        break;
      case "insert-code":
        handleInsertCode(action.content, action.file, true);
        break;
    }
  }, [files, openTabs, createFile, deleteFile, toggleConsole, handleRun, handleDeploy, theme, toggleTheme, handleInsertCode]);

  /* ===== Keyboard Shortcuts ===== */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        manualSave(files);
        return;
      }
      if (e.key === "R" && e.shiftKey) {
        e.preventDefault();
        handleRun();
        return;
      }
      if (e.key === "D" && e.shiftKey) {
        e.preventDefault();
        handleDeploy();
        return;
      }
      if (e.key === "b" && !e.shiftKey) {
        e.preventDefault();
        setShowFileExplorer((v) => !v);
        return;
      }
      if (e.key === "j" && !e.shiftKey) {
        e.preventDefault();
        toggleConsole();
        return;
      }
      if (e.key === "A" && e.shiftKey) {
        e.preventDefault();
        toggleAiPanel();
        return;
      }
      if (e.key === "k" && !e.shiftKey) {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
        return;
      }
      if (e.key === "i" && !e.shiftKey) {
        e.preventDefault();
        setCdnManagerOpen((v) => !v);
        return;
      }
      if (e.key === "C" && e.shiftKey) {
        // Ctrl+Shift+C = Inspector
        e.preventDefault();
        setInspectorMode((v) => !v);
        return;
      }
      if (e.key === "\\") {
        // Ctrl+\ = Split editor
        e.preventDefault();
        setSplitView((v) => {
          if (!v) {
            const other = openTabs.find((t) => t !== activeFile);
            if (other) setSplitFile(other);
          }
          return !v;
        });
        return;
      }
      if (e.key === "z" && e.shiftKey) {
        // Ctrl+Shift+Z = Redo
        e.preventDefault();
        const content = redoFile(activeFile);
        if (content !== null) {
          setFiles((prev) => {
            if (!prev[activeFile]) return prev;
            const next = { ...prev, [activeFile]: { ...prev[activeFile], content } };
            triggerAutoSave(next);
            return next;
          });
          setRenderedHTML(buildPreview());
        }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [files, activeFile, manualSave, handleRun, handleDeploy, toggleConsole, toggleAiPanel, redoFile, triggerAutoSave, buildPreview]);

  return (
    <div className={`flex h-screen bg-[var(--r-bg)] ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      {/* ===== Left Sidebar (48px) — hidden on mobile ===== */}
      <div className="hidden md:flex w-12 bg-[var(--r-surface)] flex-col items-center py-3 border-r border-[var(--r-border)] shrink-0">
        <button
          type="button"
          onClick={onGoHome}
          className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0079f2] to-[#00c2ff] flex items-center justify-center mb-6 hover:opacity-80 transition-opacity"
          aria-label="Home"
        >
          <Sparkles size={14} className="text-white" />
        </button>

        <div className="flex flex-col items-center gap-1 flex-1">
          <button
            type="button"
            onClick={() => setShowFileExplorer((v) => !v)}
            className={`group relative w-9 h-9 rounded-lg flex items-center justify-center transition-all ${showFileExplorer ? "text-[#0079f2] bg-[#0079f2]/10" : "text-[var(--r-text-secondary)] hover:text-[var(--r-text)] hover:bg-[var(--r-sidebar)]"}`}
            aria-label="Files"
          >
            <FolderOpen size={18} strokeWidth={1.5} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--r-sidebar)] text-xs text-[var(--r-text)] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-sm border border-[var(--r-border)]">
              Files
            </span>
          </button>
          <button
            type="button"
            onClick={toggleAiPanel}
            className={`group relative w-9 h-9 rounded-lg flex items-center justify-center transition-all ${!aiCollapsed ? "text-[#0079f2] bg-[#0079f2]/10" : "text-[var(--r-text-secondary)] hover:text-[var(--r-text)] hover:bg-[var(--r-sidebar)]"}`}
            aria-label="AI Agent"
          >
            <Sparkles size={18} strokeWidth={1.5} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--r-sidebar)] text-xs text-[var(--r-text)] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-sm border border-[var(--r-border)]">
              Agent
            </span>
          </button>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setCdnManagerOpen(true)}
            className="group relative w-9 h-9 rounded-lg flex items-center justify-center text-[var(--r-text-secondary)] hover:text-[var(--r-text)] hover:bg-[var(--r-sidebar)] transition-all"
            aria-label="CDN Libraries"
          >
            <Package size={18} strokeWidth={1.5} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--r-sidebar)] text-xs text-[var(--r-text)] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-sm border border-[var(--r-border)]">
              Libraries
            </span>
          </button>
          <button
            type="button"
            className="group relative w-9 h-9 rounded-lg flex items-center justify-center text-[var(--r-text-secondary)] hover:text-[var(--r-text)] hover:bg-[var(--r-sidebar)] transition-all"
            aria-label="Help"
          >
            <HelpCircle size={18} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="group relative w-9 h-9 rounded-lg flex items-center justify-center text-[var(--r-text-secondary)] hover:text-[var(--r-text)] hover:bg-[var(--r-sidebar)] transition-all"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
            <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--r-sidebar)] text-xs text-[var(--r-text)] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-sm border border-[var(--r-border)]">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>
        </div>
      </div>

      {/* ===== Mobile File Explorer Backdrop ===== */}
      {isMobile && showFileExplorer && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setShowFileExplorer(false)} />
      )}

      {/* ===== File Explorer / Assets Sidebar ===== */}
      {showFileExplorer && (
        <FileExplorer
          files={files}
          activeFile={activeFile}
          openFile={openFile}
          createFile={createFile}
          deleteFile={deleteFile}
          showNewFileInput={showNewFileInput}
          setShowNewFileInput={setShowNewFileInput}
          newFileName={newFileName}
          setNewFileName={setNewFileName}
          fileSearchQuery={fileSearchQuery}
          setFileSearchQuery={setFileSearchQuery}
          explorerTab={explorerTab}
          setExplorerTab={setExplorerTab}
          assets={assets}
          uploading={uploading}
          loadAssets={loadAssets}
          uploadFiles={uploadFiles}
          deleteAsset={deleteAsset}
          isMobile={isMobile}
          setShowFileExplorer={setShowFileExplorer}
        />
      )}

      {/* ===== Main IDE Area ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ===== Top Header Bar ===== */}
        <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 bg-[var(--r-surface)] border-b border-[var(--r-border)] shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={onGoHome}
              className="md:hidden p-1.5 rounded-md hover:bg-[var(--r-sidebar)] transition-colors"
              aria-label="Home"
            >
              <Home size={14} className="text-[#0079f2]" />
            </button>

            {!showFileExplorer && (
              <button
                type="button"
                onClick={() => setShowFileExplorer(true)}
                className="p-1.5 text-[var(--r-text-secondary)] hover:text-[var(--r-text)] rounded-md hover:bg-[var(--r-sidebar)] transition-colors"
                aria-label="Show explorer"
              >
                <FolderOpen size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={toggleAiPanel}
              className={`p-1.5 rounded-md transition-colors ${!aiCollapsed ? "text-[#0079f2] bg-[#0079f2]/10" : "text-[var(--r-text-secondary)] hover:text-[var(--r-text)] hover:bg-[var(--r-sidebar)]"}`}
              aria-label="AI Panel"
            >
              {aiCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>

            <div className="flex items-center gap-1.5 ml-2">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--r-text-secondary)]">
                  <Loader2 size={12} className="animate-spin" /> Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-[11px] text-[#00b894]">
                  <Check size={12} /> Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1 text-[11px] text-[#f59e0b]">
                  <CloudOff size={12} /> Offline
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => manualSave(files)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] text-[var(--r-text-secondary)] rounded-md hover:bg-[var(--r-sidebar)] transition-colors"
              aria-label="Save"
            >
              <Save size={13} />
              <span className="hidden sm:inline">Save</span>
            </button>

            <button
              type="button"
              onClick={handleRun}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#00b894] text-white text-[12px] font-bold rounded-xl hover:bg-[#00a884] transition-all"
            >
              <Play size={12} fill="currentColor" />
              Run
            </button>

            <button
              type="button"
              onClick={handleDeploy}
              disabled={deployStatus === "deploying" || !projectSlug}
              className={`flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold rounded-xl transition-all ${
                deployStatus === "deployed"
                  ? "bg-[#00b894]/20 text-[#00b894]"
                  : deployStatus === "deploying"
                  ? "bg-[#0079f2]/20 text-[#0079f2]"
                  : "bg-[#0079f2] text-white hover:bg-[#0066cc]"
              }`}
            >
              {deployStatus === "deploying" ? (
                <><Loader2 size={12} className="animate-spin" /> Deploying...</>
              ) : deployStatus === "deployed" ? (
                <><Check size={12} /> Deployed</>
              ) : (
                <><Rocket size={12} /> Deploy</>
              )}
            </button>

            {vercelPolling && vercelState === "building" && (
              <span className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#f59e0b] bg-[#f59e0b]/10 rounded-md animate-pulse">
                <Loader2 size={11} className="animate-spin" />
                Building...
              </span>
            )}
            {vercelState === "ready" && vercelUrl && (
              <a
                href={vercelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#00b894] bg-[#00b894]/10 rounded-md hover:bg-[#00b894]/20 transition-colors"
                title={vercelUrl}
              >
                <Globe size={11} />
                Live
              </a>
            )}
            {vercelState === "error" && (
              <span className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#f87171] bg-[#f87171]/10 rounded-md">
                <CloudOff size={11} />
                Build Failed
              </span>
            )}

            {deployedUrl && deployStatus === "deployed" && (
              <a
                href={deployedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-[#00b894] hover:text-[#00d9a7] transition-colors"
                title={deployedUrl}
              >
                <ExternalLink size={11} />
                Preview
              </a>
            )}

            <div className="w-px h-5 bg-[#E4E4E0] mx-1" />

            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 text-[var(--r-text-secondary)] hover:text-[var(--r-text)] rounded-md hover:bg-[var(--r-sidebar)] transition-colors"
              aria-label="Reset"
            >
              <RotateCcw size={13} />
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 text-[var(--r-text-secondary)] hover:text-[var(--r-text)] rounded-md hover:bg-[var(--r-sidebar)] transition-colors"
              aria-label="Download"
            >
              <Download size={13} />
            </button>

            <div className="hidden md:flex items-center gap-0.5 ml-1">
              {([
                ["desktop", Monitor],
                ["tablet", Tablet],
                ["mobile", Smartphone],
              ] as [ViewportSize, typeof Monitor][]).map(([size, Icon]) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setViewport(size)}
                  className={`p-1 rounded-md transition-colors ${
                    viewport === size ? "text-[#0079f2] bg-[#0079f2]/10" : "text-[var(--r-text-secondary)] hover:text-[var(--r-text)]"
                  }`}
                  aria-label={`${size} view`}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleConsole}
              className={`p-1.5 rounded-md transition-colors ${
                !consoleCollapsed ? "text-[#0079f2] bg-[#0079f2]/10" : "text-[var(--r-text-secondary)] hover:text-[var(--r-text)]"
              }`}
              aria-label="Console"
            >
              <TerminalIcon size={13} />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-[var(--r-text-secondary)] hover:text-[var(--r-text)] rounded-md hover:bg-[var(--r-sidebar)] transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>

        {/* ===== Mobile Panel Switcher ===== */}
        {isMobile && (
          <div className="flex items-center bg-[var(--r-surface)] border-b border-[var(--r-border)] shrink-0 md:hidden">
            {([
              ["editor", FileCode2, "Code"],
              ["preview", Monitor, "Preview"],
              ["console", TerminalIcon, "Console"],
              ["ai", Sparkles, "AI"],
            ] as [typeof mobilePanel, typeof FileCode2, string][]).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMobilePanel(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-colors relative ${
                  mobilePanel === id ? "text-[#0079f2]" : "text-[var(--r-text-secondary)]"
                }`}
              >
                <Icon size={14} />
                {label}
                {mobilePanel === id && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#0079f2] rounded-full" />}
              </button>
            ))}
          </div>
        )}

        {/* ===== Mobile: Single Panel View ===== */}
        {isMobile ? (
          <div className="flex-1 min-h-0 flex flex-col">
            {mobilePanel === "editor" && (
              <EditorTabs
                files={files}
                activeFile={activeFile}
                openTabs={openTabs}
                editorTheme={editorTheme}
                onTabClick={handleTabClick}
                onTabClose={handleTabClose}
                onCodeChange={handleCodeChange}
                compact
              />
            )}

            {mobilePanel === "preview" && (
              <div className="flex flex-col h-full bg-[var(--r-bg)]">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--r-border)] shrink-0">
                  <button type="button" onClick={handleRun} className="p-1 text-[var(--r-text-secondary)] hover:text-[var(--r-text)] rounded transition-colors" aria-label="Refresh">
                    <RefreshCw size={14} />
                  </button>
                  {(vercelUrl || deployedUrl) && (
                    <a href={vercelUrl ?? deployedUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#00b894] truncate flex items-center gap-1">
                      <Globe size={11} /> {vercelUrl ?? deployedUrl}
                    </a>
                  )}
                </div>
                <div className="flex-1 min-h-0 bg-white">
                  <iframe
                    ref={iframeRef}
                    srcDoc={previewHTML}
                    title="Live Preview"
                    className="w-full h-full bg-white border-0"
                    sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  />
                </div>
              </div>
            )}

            {mobilePanel === "console" && (
              <div className="flex-1 min-h-0">
                <ConsolePanel consoleTab={consoleTab} setConsoleTab={setConsoleTab} consoleLines={consoleLines} setConsoleLines={setConsoleLines} consoleFilter={consoleFilter} setConsoleFilter={setConsoleFilter} shellHistory={shellHistory} setShellHistory={setShellHistory} shellInput={shellInput} setShellInput={setShellInput} handleShellSubmit={handleShellSubmit} gitHistory={gitHistory} gitLoading={gitLoading} fetchGitHistory={fetchGitHistory} restoringCommit={restoringCommit} handleGitRestore={handleGitRestore} onCollapse={() => setMobilePanel("editor")} onAIFix={handleAIFix} wcEnabled={wcEnabled} onWcToggle={() => setWcEnabled((v) => !v)} wcStatus={wcStatus} wcShellProcess={wcShellProcess} />
              </div>
            )}

            {mobilePanel === "ai" && (
              <div className="flex-1 min-h-0">
                <AIChatPanel onInsertCode={handleInsertCode} activeFile={activeFile} currentFiles={files} onShadowCommit={handleShadowCommit} initialPrompt={initialPrompt} onGitRestore={handleGitRestore} externalMessage={aiFixMessage} onExternalMessageConsumed={() => setAIFixMessage(undefined)} autoTestCompleted={autoTestCompleted} onAutoTestReportShown={handleAutoTestReportShown} livePreviewUrl={vercelUrl ?? deployedUrl} errorFixState={errorFixState} onIDEAction={handleIDEAction} />
              </div>
            )}
          </div>
        ) : (
          /* ===== Desktop: 3-Panel Resizable Layout ===== */
          <Group
            orientation="horizontal"
            defaultLayout={horizontalLayout.defaultLayout}
            onLayoutChanged={horizontalLayout.onLayoutChanged}
            className="flex-1 min-h-0"
            id="replit-h"
          >
            {/* --- AI Chat Panel --- */}
            <Panel
              panelRef={aiPanelRef}
              defaultSize="25"
              minSize="15"
              collapsible
              id="ai-chat"
              onResize={(size) => setAiCollapsed(size.asPercentage < 1)}
            >
              <ErrorBoundary fallbackLabel="AI Chat crashed — click Retry">
                <AIChatPanel onInsertCode={handleInsertCode} activeFile={activeFile} currentFiles={files} onShadowCommit={handleShadowCommit} initialPrompt={initialPrompt} onGitRestore={handleGitRestore} externalMessage={aiFixMessage} onExternalMessageConsumed={() => setAIFixMessage(undefined)} autoTestCompleted={autoTestCompleted} onAutoTestReportShown={handleAutoTestReportShown} livePreviewUrl={vercelUrl ?? deployedUrl} errorFixState={errorFixState} onIDEAction={handleIDEAction} />
              </ErrorBoundary>
            </Panel>

            <Separator className="splitter-handle-v" />

            {/* --- Editor + Console --- */}
            <Panel defaultSize="40" minSize="25" id="editor-console">
              <Group
                orientation="vertical"
                defaultLayout={verticalLayout.defaultLayout}
                onLayoutChanged={verticalLayout.onLayoutChanged}
                className="h-full"
                id="replit-v"
              >
                {/* Editor (supports split view) */}
                <Panel defaultSize="70" minSize="30" id="editor">
                  {splitView ? (
                    <div className="flex h-full">
                      <div className="flex-1 min-w-0 border-r border-[#404040]">
                        <EditorTabs
                          files={files}
                          activeFile={activeFile}
                          openTabs={openTabs}
                          editorTheme={editorTheme}
                          onTabClick={handleTabClick}
                          onTabClose={handleTabClose}
                          onCodeChange={handleCodeChange}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <EditorTabs
                          files={files}
                          activeFile={splitFile}
                          openTabs={openTabs}
                          editorTheme={editorTheme}
                          onTabClick={(f) => setSplitFile(f)}
                          onTabClose={handleTabClose}
                          onCodeChange={handleSplitCodeChange}
                        />
                      </div>
                    </div>
                  ) : (
                    <EditorTabs
                      files={files}
                      activeFile={activeFile}
                      openTabs={openTabs}
                      editorTheme={editorTheme}
                      onTabClick={handleTabClick}
                      onTabClose={handleTabClose}
                      onCodeChange={handleCodeChange}
                    />
                  )}
                </Panel>

                <Separator className="splitter-handle-h" />

                {/* Console/Shell Panel */}
                <Panel
                  panelRef={consolePanelRef}
                  defaultSize="30"
                  minSize="10"
                  collapsible
                  collapsedSize="0"
                  id="console"
                  onResize={(size) => setConsoleCollapsed(size.asPercentage < 1)}
                >
                  <ErrorBoundary fallbackLabel="Console crashed — click Retry">
                    <ConsolePanel
                      consoleTab={consoleTab}
                      setConsoleTab={setConsoleTab}
                      consoleLines={consoleLines}
                      setConsoleLines={setConsoleLines}
                      consoleFilter={consoleFilter}
                      setConsoleFilter={setConsoleFilter}
                      shellHistory={shellHistory}
                      setShellHistory={setShellHistory}
                      shellInput={shellInput}
                      setShellInput={setShellInput}
                      handleShellSubmit={handleShellSubmit}
                      gitHistory={gitHistory}
                      gitLoading={gitLoading}
                      fetchGitHistory={fetchGitHistory}
                      restoringCommit={restoringCommit}
                      handleGitRestore={handleGitRestore}
                      onCollapse={() => consolePanelRef.current?.collapse()}
                      onAIFix={handleAIFix}
                      wcEnabled={wcEnabled}
                      onWcToggle={() => setWcEnabled((v) => !v)}
                      wcStatus={wcStatus}
                      wcShellProcess={wcShellProcess}
                    />
                  </ErrorBoundary>
                </Panel>
              </Group>
            </Panel>

            <Separator className="splitter-handle-v" />

            {/* --- Preview Panel --- */}
            <Panel
              panelRef={previewPanelRef}
              defaultSize="35"
              minSize="15"
              collapsible
              id="preview"
            >
              <ErrorBoundary fallbackLabel="Preview crashed — click Retry">
                <PreviewPanel
                  renderedHTML={previewHTML}
                  viewport={viewport}
                  iframeRef={iframeRef}
                  handleRun={handleRun}
                  vercelState={vercelState}
                  vercelUrl={vercelUrl}
                  vercelCommitMsg={vercelCommitMsg}
                  deployedUrl={deployedUrl}
                  inspectorMode={inspectorMode}
                  onInspectorToggle={() => setInspectorMode((v) => !v)}
                  wcServerUrl={wcServerUrl}
                  isSyncing={isSyncing}
                  showSynced={showSynced}
                  autoTestActive={autoTestActive}
                  onAutoTestComplete={handleAutoTestComplete}
                />
              </ErrorBoundary>
            </Panel>
          </Group>
        )}
      </div>
      {diffPreview && (
        <DiffPreview
          fileName={diffPreview.fileName}
          oldCode={diffPreview.oldCode}
          newCode={diffPreview.newCode}
          onAccept={handleDiffAccept}
          onReject={handleDiffReject}
        />
      )}
      <CDNManager
        isOpen={cdnManagerOpen}
        onClose={() => setCdnManagerOpen(false)}
        htmlContent={files["index.html"]?.content ?? ""}
        onInsertTag={handleCDNInsert}
      />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        files={files}
        onOpenFile={openFile}
        onCreateFile={() => { setCommandPaletteOpen(false); setShowNewFileInput(true); }}
        onDeploy={handleDeploy}
        onToggleTheme={toggleTheme}
        onToggleAI={toggleAiPanel}
        onRun={handleRun}
        theme={theme}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <AIStatusIndicator action={currentIDEAction} />
    </div>
  );
}
