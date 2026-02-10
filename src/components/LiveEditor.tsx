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

const WebTerminal = dynamic(() => import("./WebTerminal"), { ssr: false });

/* ===== Default Project Files ===== */
const DEFAULT_FILES: Record<string, VFile> = {
  "index.html": {
    name: "index.html",
    language: "html",
    content: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My App — Field Nine</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="app">
    <nav class="nav">
      <div class="nav-brand">
        <span class="logo">⚡</span>
        <span>Field Nine App</span>
      </div>
      <div class="nav-links">
        <a href="#" class="active">Home</a>
        <a href="#">About</a>
        <a href="#">Contact</a>
      </div>
    </nav>

    <main class="hero">
      <div class="hero-badge">🚀 AI-Powered Development</div>
      <h1>Build Anything,<br/><span class="gradient-text">Ship Everywhere</span></h1>
      <p>이 에디터에서 직접 코드를 수정해보세요.<br/>실시간으로 결과가 반영됩니다.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" id="startBtn">시작하기</button>
        <button class="btn btn-secondary" id="addCardBtn">카드 추가</button>
      </div>
      <div class="counter-display">
        클릭: <span id="count">0</span>회 | 카드: <span id="cardCount">0</span>개
      </div>
    </main>

    <section class="cards" id="cardContainer">
    </section>

    <footer class="footer">
      <p>Built with <span class="heart">♥</span> on Field Nine</p>
    </footer>
  </div>

  <script src="app.js"></script>
</body>
</html>`,
    icon: FileCode2,
  },
  "style.css": {
    name: "style.css",
    language: "css",
    content: `/* === Field Nine App Styles === */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0a0a0a;
  color: #e2e8f0;
  min-height: 100vh;
}

.app {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
}

/* --- Navigation --- */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 18px;
}

.logo { font-size: 24px; }

.nav-links { display: flex; gap: 24px; }

.nav-links a {
  color: #64748b;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.nav-links a:hover,
.nav-links a.active { color: #f1f5f9; }

/* --- Hero --- */
.hero {
  text-align: center;
  padding: 80px 0 60px;
}

.hero-badge {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(37, 99, 235, 0.15);
  border: 1px solid rgba(37, 99, 235, 0.3);
  border-radius: 100px;
  font-size: 13px;
  color: #60a5fa;
  margin-bottom: 24px;
}

.hero h1 {
  font-size: 48px;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 20px;
  letter-spacing: -1px;
}

.gradient-text {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero p {
  color: #94a3b8;
  font-size: 16px;
  line-height: 1.7;
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.btn {
  padding: 12px 28px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
}

.btn-secondary {
  background: rgba(255,255,255,0.06);
  color: #cbd5e1;
  border: 1px solid rgba(255,255,255,0.1);
}

.btn-secondary:hover {
  background: rgba(255,255,255,0.1);
  transform: translateY(-2px);
}

.counter-display {
  font-size: 14px;
  color: #64748b;
  padding: 12px 20px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  display: inline-block;
}

.counter-display span {
  color: #3b82f6;
  font-weight: 700;
  font-size: 18px;
}

/* --- Cards --- */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  padding: 40px 0;
}

.card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 24px;
  animation: slideUp 0.4s ease-out;
  transition: all 0.2s;
}

.card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.3);
}

.card-emoji { font-size: 32px; margin-bottom: 12px; }
.card h3 { font-size: 16px; margin-bottom: 8px; }
.card p { font-size: 13px; color: #64748b; line-height: 1.5; }
.card-time { font-size: 11px; color: #475569; margin-top: 12px; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- Footer --- */
.footer {
  text-align: center;
  padding: 40px 0;
  border-top: 1px solid rgba(255,255,255,0.06);
  color: #475569;
  font-size: 14px;
}

.heart { color: #ef4444; }`,
    icon: FileText,
  },
  "app.js": {
    name: "app.js",
    language: "javascript",
    content: `// === Field Nine App Logic ===
document.addEventListener('DOMContentLoaded', () => {
  let clickCount = 0;
  let cardCount = 0;

  const emojis = ['🚀', '⚡', '🎨', '🔥', '💡', '🎯', '✨', '🌈', '🎮', '🛸'];
  const titles = ['새로운 프로젝트', 'AI 분석 완료', '배포 성공!', '성능 최적화', '버그 수정됨'];
  const descs = ['Field Nine으로 빠르게 구축했습니다.', 'AI가 코드를 최적화했습니다.', '전 세계에 배포 완료.'];

  const countEl = document.getElementById('count');
  const cardCountEl = document.getElementById('cardCount');
  const container = document.getElementById('cardContainer');
  const startBtn = document.getElementById('startBtn');
  const addCardBtn = document.getElementById('addCardBtn');

  function handleStart() {
    clickCount++;
    if (countEl) countEl.textContent = clickCount;
    const hue = (clickCount * 15) % 360;
    document.body.style.background =
      \\\`linear-gradient(135deg, hsl(\\\${hue}, 20%, 4%) 0%, hsl(\\\${hue + 30}, 15%, 8%) 100%)\\\`;
  }

  function addCard() {
    cardCount++;
    if (cardCountEl) cardCountEl.textContent = cardCount;
    if (!container) return;
    const card = document.createElement('div');
    card.className = 'card';
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const title = titles[Math.floor(Math.random() * titles.length)];
    const desc = descs[Math.floor(Math.random() * descs.length)];
    const now = new Date().toLocaleTimeString('ko-KR');
    card.innerHTML = \\\`
      <div class="card-emoji">\\\${emoji}</div>
      <h3>\\\${title}</h3>
      <p>\\\${desc}</p>
      <div class="card-time">\\\${now}에 생성됨</div>
    \\\`;
    container.prepend(card);
  }

  if (startBtn) startBtn.addEventListener('click', handleStart);
  if (addCardBtn) addCardBtn.addEventListener('click', addCard);

  // 초기 카드 3개 생성
  for (let i = 0; i < 3; i++) {
    setTimeout(() => addCard(), i * 200);
  }

  console.log('🚀 Field Nine App loaded!');
  console.log('📦 Files: index.html, style.css, app.js');
  console.log('✅ Ready to dev!');
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
  const [openTabs, setOpenTabs] = useState(["index.html", "style.css", "app.js"]);
  const [renderedHTML, setRenderedHTML] = useState("");
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [editorTheme] = useState<EditorTheme>("vs-dark");
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<"editor" | "preview" | "ai">("editor");
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
      try {
        const res = await fetch("/api/save-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: fileChanges, message: commitMsg }),
        });
        const data = await res.json();
        if (data.success) {
          startVercelPolling();
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
        handleShadowCommit(fileChanges, "chore: auto-save code changes");
      }, 10_000);
    },
    [handleShadowCommit],
  );

  /* ===== Fetch Git History ===== */
  const fetchGitHistory = useCallback(async () => {
    setGitLoading(true);
    try {
      const res = await fetch("/api/git-history?per_page=30");
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
      setFiles((prev) => ({ ...prev, ...restoredFiles }));
      setOpenTabs((prev) => {
        const newTabs = [...prev];
        for (const name of Object.keys(restoredFiles)) {
          if (!newTabs.includes(name)) newTabs.push(name);
        }
        return newTabs;
      });
      triggerAutoSave({ ...files, ...restoredFiles });
      addToast({ type: "success", message: `커밋 ${data.sha}로 복원 완료` });
    } catch (err) {
      addToast({ type: "error", message: `복원 실패: ${(err as Error).message}` });
    } finally {
      setRestoringCommit(null);
    }
  }, [files, triggerAutoSave, addToast]);

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
  useEffect(() => {
    loadFromStorage().then((loaded) => {
      if (loaded) {
        setFiles(loaded);
        setOpenTabs(Object.keys(loaded));
        setActiveFile(Object.keys(loaded)[0] ?? "index.html");
      }
    });
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Build combined HTML ===== */
  const buildPreview = useCallback(() => {
    const html = files["index.html"]?.content ?? "";
    const css = files["style.css"]?.content ?? "";
    const js = files["app.js"]?.content ?? "";

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
        })();
      </script>
    `;

    let combined = html;
    combined = combined.replace(
      /<link\s+rel="stylesheet"\s+href="style\.css"\s*\/?>/gi,
      `<style id="fn-hot-style">${css}</style>`
    );
    combined = combined.replace(
      /<script\s+src="app\.js"\s*><\/script>/gi,
      `<script>try{${js}}catch(e){console.error('app.js runtime error:',e.message)}</script>`
    );

    const headIdx = combined.indexOf("<head>");
    if (headIdx !== -1) {
      combined = combined.slice(0, headIdx + 6) + consoleCapture + combined.slice(headIdx + 6);
    } else {
      combined = consoleCapture + combined;
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
  }, [files, openTabs]);

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

      // CSS Hot Inject: skip full reload for CSS-only changes
      if (activeFile === "style.css" || activeFile.endsWith(".css")) {
        if (hotInjectCSS(newContent)) return; // hot-injected, no full rebuild
      }

      setIsSyncing(true);
      if (autoRunRef.current) clearTimeout(autoRunRef.current);
      autoRunRef.current = setTimeout(() => {
        setConsoleLines([]);
        setRenderedHTML(buildPreview());
        setIsSyncing(false);
      }, 300);
    },
    [activeFile, buildPreview, triggerAutoSave, triggerAutoCommit, hotInjectCSS, pushUndoSnapshot]
  );

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
    setOpenTabs(["index.html", "style.css", "app.js"]);
    setConsoleLines([]);
    clearLocalStorage();
    setTimeout(() => setRenderedHTML(""), 0);
    setTimeout(() => {
      const html = fresh["index.html"].content;
      const css = fresh["style.css"].content;
      const js = fresh["app.js"].content;
      const combined = html
        .replace(/<link\s+rel="stylesheet"\s+href="style\.css"\s*\/?>/gi, `<style>${css}</style>`)
        .replace(/<script\s+src="app\.js"\s*><\/script>/gi, `<script>try{${js}}catch(e){console.error('app.js runtime error:',e.message)}</script>`);
      setRenderedHTML(combined);
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
  }, [openTabs, triggerAutoSave, triggerAutoCommit, pushUndoSnapshot]);

  // Pending diff insertion (stored for accept/reject)
  const pendingInsertRef = useRef<{ code: string; targetFile: string } | null>(null);

  const handleInsertCode = useCallback((code: string, targetFile: string, auto?: boolean) => {
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
  }, [files, applyCodeDirect]);

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
      if (splitFile === "style.css" || splitFile.endsWith(".css")) {
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
    setDeployStatus("deploying");
    const toastId = addToast({ type: "loading", message: "배포 중..." });
    await manualSave(files);

    const fileChanges = Object.entries(files).map(([name, f]) => ({
      path: name,
      content: f.content,
    }));
    handleShadowCommit(fileChanges, `deploy: ${projectSlug}`);

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
                    sandbox="allow-scripts allow-modals"
                  />
                </div>
              </div>
            )}

            {mobilePanel === "ai" && (
              <div className="flex-1 min-h-0">
                <AIChatPanel onInsertCode={handleInsertCode} activeFile={activeFile} currentFiles={files} onShadowCommit={handleShadowCommit} initialPrompt={initialPrompt} onGitRestore={handleGitRestore} externalMessage={aiFixMessage} onExternalMessageConsumed={() => setAIFixMessage(undefined)} />
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
                <AIChatPanel onInsertCode={handleInsertCode} activeFile={activeFile} currentFiles={files} onShadowCommit={handleShadowCommit} initialPrompt={initialPrompt} onGitRestore={handleGitRestore} externalMessage={aiFixMessage} onExternalMessageConsumed={() => setAIFixMessage(undefined)} />
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
    </div>
  );
}
