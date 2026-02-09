"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
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
  X,
  FolderOpen,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  FilePlus2,
  Download,
  FileCode2,
  FileText,
  FileCog,
  Sparkles,
  Save,
  Check,
  Loader2,
  CloudOff,
  Rocket,
  Home,
  AppWindow,
  Globe,
  Settings,
  HelpCircle,
  Search,
  RefreshCw,
  ExternalLink,
  Lock,
  Image as ImageIcon,
  Upload,
  Copy,
  Link,
} from "lucide-react";
import AIChatPanel from "./AIChatPanel";
import { useProjectSave } from "@/hooks/useProjectSave";
import { useAssets, type AssetFile } from "@/hooks/useAssets";
import { useDeployStatus } from "@/hooks/useDeployStatus";
import { deployProject } from "@/lib/deploy";
import { parseAIResponse } from "@/lib/parseAIResponse";

/* ===== File System Types ===== */
interface VFile {
  name: string;
  language: string;
  content: string;
  icon: React.ElementType;
}

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
        <button class="btn btn-primary" onclick="handleStart()">시작하기</button>
        <button class="btn btn-secondary" onclick="addCard()">카드 추가</button>
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

let clickCount = 0;
let cardCount = 0;

const emojis = ['🚀', '⚡', '🎨', '🔥', '💡', '🎯', '✨', '🌈', '🎮', '🛸'];
const titles = [
  '새로운 프로젝트', 'AI 분석 완료', '배포 성공!',
  '성능 최적화', '버그 수정됨', '팀 협업 시작',
  '데이터 동기화', 'API 연결됨', '테스트 통과', '릴리즈 준비'
];
const descs = [
  'Field Nine으로 빠르게 구축했습니다.',
  'AI가 자동으로 코드를 최적화했습니다.',
  '글로벌 CDN으로 전 세계에 배포 완료.',
  '응답 속도가 3배 빨라졌습니다.',
  '자동 탐지 시스템이 문제를 해결했습니다.',
];

function handleStart() {
  clickCount++;
  document.getElementById('count').textContent = clickCount;

  const hue = (clickCount * 15) % 360;
  document.body.style.background =
    \`linear-gradient(135deg, hsl(\${hue}, 20%, 4%) 0%, hsl(\${hue + 30}, 15%, 8%) 100%)\`;
}

function addCard() {
  cardCount++;
  document.getElementById('cardCount').textContent = cardCount;

  const container = document.getElementById('cardContainer');
  const card = document.createElement('div');
  card.className = 'card';

  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  const title = titles[Math.floor(Math.random() * titles.length)];
  const desc = descs[Math.floor(Math.random() * descs.length)];
  const now = new Date().toLocaleTimeString('ko-KR');

  card.innerHTML = \`
    <div class="card-emoji">\${emoji}</div>
    <h3>\${title}</h3>
    <p>\${desc}</p>
    <div class="card-time">\${now}에 생성됨</div>
  \`;

  container.prepend(card);
}

// 초기 카드 3개 생성
for (let i = 0; i < 3; i++) {
  setTimeout(() => addCard(), i * 200);
}

console.log('🚀 Field Nine App loaded!');
console.log('📦 Files: index.html, style.css, app.js');
console.log('✅ Ready to dev!');`,
    icon: FileCog,
  },
};

type ViewportSize = "desktop" | "tablet" | "mobile";
type EditorTheme = "vs-dark" | "light" | "hc-black";
type ConsoleTab = "console" | "shell";
type ExplorerTab = "files" | "assets";

interface ConsoleLine {
  type: "log" | "error" | "warn" | "info";
  text: string;
  time: string;
}

const FILE_ICON_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  html: { icon: FileCode2, color: "text-[#e44d26]" },
  css: { icon: FileText, color: "text-[#2965f1]" },
  javascript: { icon: FileCog, color: "text-[#f7df1e]" },
  json: { icon: FileCog, color: "text-[#5b5b5b]" },
  markdown: { icon: FileText, color: "text-[#858585]" },
};

function getFileInfo(fileName: string) {
  const ext = fileName.split(".").pop() ?? "";
  const langMap: Record<string, string> = {
    html: "html", htm: "html", css: "css", js: "javascript",
    json: "json", md: "markdown", txt: "plaintext", ts: "typescript",
  };
  const language = langMap[ext] ?? "plaintext";
  const info = FILE_ICON_MAP[language] ?? { icon: FileText, color: "text-[#858585]" };
  return { language, ...info };
}

/* ===== Sidebar Nav ===== */
const SIDEBAR_NAV = [
  { icon: Home, label: "Home", id: "home" },
  { icon: AppWindow, label: "My Apps", id: "apps" },
  { icon: Globe, label: "Published", id: "published" },
];

/* ===== Main Component ===== */
interface LiveEditorProps {
  initialPrompt?: string;
  projectSlug: string | null;
  onGoHome?: () => void;
}

export default function LiveEditor({ initialPrompt, projectSlug, onGoHome }: LiveEditorProps) {
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
  const [newFileName, setNewFileName] = useState("");
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("console");
  const [shellInput, setShellInput] = useState("");
  const [shellHistory, setShellHistory] = useState<string[]>([
    "$ npm install",
    "added 0 packages in 0.3s",
    "$ npm start",
    "Server running on port 3000",
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deployStatus, setDeployStatus] = useState<"idle" | "deploying" | "deployed">("idle");
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [explorerTab, setExplorerTab] = useState<ExplorerTab>("files");
  const [dragOver, setDragOver] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

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
          // Trigger Vercel deploy status polling
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

  const fileInputRef = useRef<HTMLInputElement>(null);
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

  /* ===== Handle initial prompt (AI code generation) ===== */
  useEffect(() => {
    if (!initialPrompt) return;
    setIsGenerating(true);

    const abortController = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `다음 요청에 맞는 완전한 웹사이트를 만들어주세요. index.html, style.css, app.js 세 파일 모두 완전한 코드를 생성해주세요:\n\n${initialPrompt}`,
              },
            ],
          }),
          signal: abortController.signal,
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);

        // Read the full streaming response
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let rawStream = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          rawStream += decoder.decode(value, { stream: true });
        }

        // Parse Vercel AI SDK UI Message Stream Protocol (SSE format)
        // Lines: data: {"type":"text-delta","delta":"chunk"}
        let fullText = "";
        for (const line of rawStream.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") break;
          try {
            const obj = JSON.parse(payload);
            if (obj.type === "text-delta" && typeof obj.delta === "string") {
              fullText += obj.delta;
            }
          } catch {
            // skip non-JSON lines
          }
        }

        // Extract code blocks using shared parser
        const { codeBlocks } = parseAIResponse(fullText);

        if (codeBlocks.length > 0) {
          // Build files from parsed code blocks
          const newFiles: Record<string, VFile> = {};
          for (const block of codeBlocks) {
            const info = getFileInfo(block.targetFile);
            newFiles[block.targetFile] = {
              name: block.targetFile,
              language: info.language,
              content: block.code,
              icon: info.icon,
            };
          }

          // Ensure all 3 default files exist (fill missing with defaults)
          for (const key of ["index.html", "style.css", "app.js"]) {
            if (!newFiles[key]) {
              newFiles[key] = JSON.parse(JSON.stringify(DEFAULT_FILES[key]));
            }
          }

          setFiles(newFiles);
          setOpenTabs(Object.keys(newFiles));
          setActiveFile("index.html");
          triggerAutoSave(newFiles);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[LiveEditor] AI generation failed:", err);
          // Fallback: use default files as-is
        }
      } finally {
        setIsGenerating(false);
      }
    })();

    return () => abortController.abort();
  }, [initialPrompt, triggerAutoSave]);

  /* ===== Build combined HTML ===== */
  const buildPreview = useCallback(() => {
    const html = files["index.html"]?.content ?? "";
    const css = files["style.css"]?.content ?? "";
    const js = files["app.js"]?.content ?? "";

    const consoleCapture = `
      <script>
        (function() {
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
      `<style>${css}</style>`
    );
    combined = combined.replace(
      /<script\s+src="app\.js"\s*><\/script>/gi,
      `<script>${js}</script>`
    );

    const headIdx = combined.indexOf("<head>");
    if (headIdx !== -1) {
      combined = combined.slice(0, headIdx + 6) + consoleCapture + combined.slice(headIdx + 6);
    } else {
      combined = consoleCapture + combined;
    }

    return combined;
  }, [files]);

  /* ===== Console messages from iframe ===== */
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
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  /* ===== Auto-run on code change ===== */
  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newContent = value ?? "";
      setFiles((prev) => {
        const next = { ...prev, [activeFile]: { ...prev[activeFile], content: newContent } };
        triggerAutoSave(next);
        return next;
      });

      if (autoRunRef.current) clearTimeout(autoRunRef.current);
      autoRunRef.current = setTimeout(() => {
        setConsoleLines([]);
        setRenderedHTML(buildPreview());
      }, 300);
    },
    [activeFile, buildPreview, triggerAutoSave]
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
        .replace(/<script\s+src="app\.js"\s*><\/script>/gi, `<script>${js}</script>`);
      setRenderedHTML(combined);
    }, 50);
  }, [clearLocalStorage]);

  /* ===== File CRUD ===== */
  const createFile = useCallback((name: string) => {
    if (!name || files[name]) return;
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

  /* ===== AI Code Insertion ===== */
  const handleInsertCode = useCallback((code: string, targetFile: string) => {
    setFiles((prev) => {
      const file = prev[targetFile];
      if (!file) return prev;
      const next = { ...prev, [targetFile]: { ...file, content: file.content + "\n" + code } };
      triggerAutoSave(next);
      return next;
    });
    if (!openTabs.includes(targetFile)) setOpenTabs((prev) => [...prev, targetFile]);
    setActiveFile(targetFile);
    if (autoRunRef.current) clearTimeout(autoRunRef.current);
    autoRunRef.current = setTimeout(() => {
      setConsoleLines([]);
      setRenderedHTML(buildPreview());
    }, 300);
  }, [openTabs, buildPreview, triggerAutoSave]);

  /* ===== Download ===== */
  const handleDownload = useCallback(() => {
    const fileList = Object.entries(files);
    const content = fileList.map(([name, f]) => `// === ${name} ===\n${f.content}`).join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fieldnine-project.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [files]);

  /* ===== Real Deploy — Supabase Storage ===== */
  const handleDeploy = useCallback(async () => {
    if (!projectSlug) return;
    setDeployStatus("deploying");
    await manualSave(files);

    const combinedHTML = buildPreview();
    const url = await deployProject(projectSlug, combinedHTML);

    if (url) {
      setDeployedUrl(url);
      setDeployStatus("deployed");
      setTimeout(() => setDeployStatus("idle"), 8000);
    } else {
      setDeployStatus("idle");
    }
  }, [files, projectSlug, manualSave, buildPreview]);

  /* ===== Asset drag & drop ===== */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleCopyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /* ===== Shell commands ===== */
  const handleShellSubmit = useCallback((cmd: string) => {
    if (!cmd.trim()) return;
    setShellHistory((prev) => [...prev, `$ ${cmd}`]);
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
      setShellHistory((prev) => [...prev, "v20.11.0"]);
    } else if (lower === "npm -v") {
      setShellHistory((prev) => [...prev, "10.2.4"]);
    } else if (lower === "help") {
      setShellHistory((prev) => [...prev, "Commands: ls, pwd, echo, clear, node -v, npm -v, help"]);
    } else {
      setShellHistory((prev) => [...prev, `bash: ${cmd}: command not found`]);
    }
    setShellInput("");
  }, [files]);

  const handleTabClick = (fileName: string) => setActiveFile(fileName);

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
    // 파일 전환 시 프리뷰 갱신
    setRenderedHTML(buildPreview());
  };

  const viewportWidths: Record<ViewportSize, string> = {
    desktop: "100%", tablet: "768px", mobile: "375px",
  };

  const consoleColorMap: Record<string, string> = {
    log: "text-[#d4d4d4]", error: "text-[#f87171]", warn: "text-[#fbbf24]", info: "text-[#60a5fa]",
  };

  const fileList = Object.keys(files);

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

  return (
    <div className={`flex h-screen bg-[#F9F9F7] ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      {/* ===== Left Sidebar (48px) — Replit-style ===== */}
      <div className="w-12 bg-white flex flex-col items-center py-3 border-r border-[#E4E4E0] shrink-0">
        <button
          type="button"
          onClick={onGoHome}
          className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0079f2] to-[#00c2ff] flex items-center justify-center mb-6 hover:opacity-80 transition-opacity"
          aria-label="Home"
        >
          <Sparkles size={14} className="text-white" />
        </button>

        <div className="flex flex-col items-center gap-1 flex-1">
          {SIDEBAR_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => item.id === "home" && onGoHome?.()}
                className="group relative w-9 h-9 rounded-lg flex items-center justify-center text-[#5F6B7A] hover:text-[#1D2433] hover:bg-[#F0F0ED] transition-all"
                aria-label={item.label}
              >
                <Icon size={18} strokeWidth={1.5} />
                <span className="absolute left-full ml-2 px-2 py-1 bg-[#F0F0ED] text-xs text-[#1D2433] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-sm border border-[#E4E4E0]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            className="group relative w-9 h-9 rounded-lg flex items-center justify-center text-[#5F6B7A] hover:text-[#1D2433] hover:bg-[#F0F0ED] transition-all"
            aria-label="Help"
          >
            <HelpCircle size={18} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="group relative w-9 h-9 rounded-lg flex items-center justify-center text-[#5F6B7A] hover:text-[#1D2433] hover:bg-[#F0F0ED] transition-all"
            aria-label="Settings"
          >
            <Settings size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ===== File Explorer / Assets Sidebar ===== */}
      {showFileExplorer && (
        <div className="w-[220px] bg-[#F9F9F7] border-r border-[#E4E4E0] flex flex-col shrink-0">
          {/* Tab header: Files | Assets */}
          <div className="flex items-center border-b border-[#E4E4E0] shrink-0">
            <button
              type="button"
              onClick={() => setExplorerTab("files")}
              className={`flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors relative ${
                explorerTab === "files" ? "text-[#1D2433]" : "text-[#5F6B7A] hover:text-[#1D2433]"
              }`}
            >
              Files
              {explorerTab === "files" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0079f2]" />}
            </button>
            <button
              type="button"
              onClick={() => { setExplorerTab("assets"); loadAssets(); }}
              className={`flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors relative ${
                explorerTab === "assets" ? "text-[#1D2433]" : "text-[#5F6B7A] hover:text-[#1D2433]"
              }`}
            >
              Assets
              {explorerTab === "assets" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0079f2]" />}
            </button>
            <button
              type="button"
              onClick={() => setShowFileExplorer(false)}
              className="p-1 mr-1 text-[#5F6B7A] hover:text-[#1D2433] rounded transition-colors"
              aria-label="Close explorer"
            >
              <X size={13} />
            </button>
          </div>

          {explorerTab === "files" ? (
            /* ===== FILES TAB ===== */
            <>
              {/* Actions row */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[10px] text-[#9DA5B0]">{fileList.length} files</span>
                <button
                  type="button"
                  onClick={() => setShowNewFileInput(true)}
                  className="p-1 text-[#5F6B7A] hover:text-[#1D2433] rounded transition-colors"
                  aria-label="New file"
                >
                  <FilePlus2 size={13} />
                </button>
              </div>

              {/* Search */}
              <div className="px-2 pb-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9DA5B0]" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    className="w-full pl-7 pr-2 py-1 bg-white border border-[#E4E4E0] text-[11px] text-[#1D2433] placeholder-[#9DA5B0] rounded-md outline-none focus:border-[#0079f2] transition-colors"
                  />
                </div>
              </div>

              {/* New file input */}
              {showNewFileInput && (
                <div className="px-2 pb-2">
                  <form onSubmit={(e) => { e.preventDefault(); createFile(newFileName); }}>
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="filename.ext"
                      className="w-full bg-white text-[#1D2433] text-[11px] px-2 py-1.5 rounded-md border border-[#0079f2] outline-none font-mono"
                      autoFocus
                      onBlur={() => { setShowNewFileInput(false); setNewFileName(""); }}
                      onKeyDown={(e) => { if (e.key === "Escape") { setShowNewFileInput(false); setNewFileName(""); }}}
                    />
                  </form>
                </div>
              )}

              {/* File tree */}
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
                          ? "bg-[#E8F2FF] text-[#1D2433]"
                          : "text-[#5F6B7A] hover:bg-[#F5F5F3]"
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
            /* ===== ASSETS TAB ===== */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Upload area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`mx-2 mt-2 border-2 border-dashed rounded-xl p-3 text-center transition-colors cursor-pointer ${
                  dragOver
                    ? "border-[#0079f2] bg-[#0079f2]/10"
                    : "border-[#E4E4E0] hover:border-[#C8C8C4]"
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
                    <Upload size={18} className="text-[#9DA5B0] mx-auto mb-1" />
                    <p className="text-[11px] text-[#5F6B7A]">Drop files or click to upload</p>
                  </>
                )}
              </div>

              {/* Assets list */}
              <div className="flex-1 overflow-y-auto px-1 py-2">
                {assets.length === 0 ? (
                  <div className="text-center py-6">
                    <ImageIcon size={24} className="text-[#E4E4E0] mx-auto mb-2" />
                    <p className="text-[11px] text-[#9DA5B0]">No assets yet</p>
                  </div>
                ) : (
                  assets.map((asset: AssetFile) => (
                    <div
                      key={asset.url}
                      className="group flex items-center gap-2 px-2 py-[5px] rounded-md text-[12px] mx-1 hover:bg-[#F5F5F3] transition-colors"
                    >
                      {asset.type.startsWith("image/") ? (
                        <div className="w-6 h-6 rounded overflow-hidden bg-[#F0F0ED] flex items-center justify-center shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <ImageIcon size={14} className="text-[#5F6B7A] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-[#1D2433] truncate font-mono">{asset.name}</div>
                        <div className="text-[9px] text-[#9DA5B0]">{formatFileSize(asset.size)}</div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(asset.url)}
                          className="p-0.5 text-[#5F6B7A] hover:text-[#0079f2] rounded transition-colors"
                          title="Copy URL"
                        >
                          {copiedUrl === asset.url ? <Check size={11} className="text-[#00b894]" /> : <Copy size={11} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(asset.url)}
                          className="p-0.5 text-[#5F6B7A] hover:text-[#0079f2] rounded transition-colors"
                          title="Insert URL"
                        >
                          <Link size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAsset(asset.name)}
                          className="p-0.5 text-[#5F6B7A] hover:text-[#f87171] rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-3 py-2 border-t border-[#E4E4E0] text-[10px] text-[#9DA5B0]">
                {assets.length} assets
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Main IDE Area ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ===== Top Header Bar ===== */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-[#E4E4E0] shrink-0">
          <div className="flex items-center gap-2">
            {!showFileExplorer && (
              <button
                type="button"
                onClick={() => setShowFileExplorer(true)}
                className="p-1.5 text-[#5F6B7A] hover:text-[#1D2433] rounded-md hover:bg-[#F0F0ED] transition-colors"
                aria-label="Show explorer"
              >
                <FolderOpen size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={toggleAiPanel}
              className={`p-1.5 rounded-md transition-colors ${!aiCollapsed ? "text-[#0079f2] bg-[#0079f2]/10" : "text-[#5F6B7A] hover:text-[#1D2433] hover:bg-[#F0F0ED]"}`}
              aria-label="AI Panel"
            >
              {aiCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>

            {/* Save status */}
            <div className="flex items-center gap-1.5 ml-2">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-[11px] text-[#5F6B7A]">
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
            {/* Save */}
            <button
              type="button"
              onClick={() => manualSave(files)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] text-[#5F6B7A] rounded-md hover:bg-[#F0F0ED] transition-colors"
              aria-label="Save"
            >
              <Save size={13} />
              <span className="hidden sm:inline">Save</span>
            </button>

            {/* Run */}
            <button
              type="button"
              onClick={handleRun}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#00b894] text-white text-[12px] font-bold rounded-xl hover:bg-[#00a884] transition-all"
            >
              <Play size={12} fill="currentColor" />
              Run
            </button>

            {/* Deploy */}
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

            {/* Vercel Real-time Deploy Badge */}
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

            {/* Deployed URL link (Supabase deploy) */}
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

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 text-[#5F6B7A] hover:text-[#1D2433] rounded-md hover:bg-[#F0F0ED] transition-colors"
              aria-label="Reset"
            >
              <RotateCcw size={13} />
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 text-[#5F6B7A] hover:text-[#1D2433] rounded-md hover:bg-[#F0F0ED] transition-colors"
              aria-label="Download"
            >
              <Download size={13} />
            </button>

            {/* Viewport */}
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
                    viewport === size ? "text-[#0079f2] bg-[#0079f2]/10" : "text-[#5F6B7A] hover:text-[#1D2433]"
                  }`}
                  aria-label={`${size} view`}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>

            {/* Console toggle */}
            <button
              type="button"
              onClick={toggleConsole}
              className={`p-1.5 rounded-md transition-colors ${
                !consoleCollapsed ? "text-[#0079f2] bg-[#0079f2]/10" : "text-[#5F6B7A] hover:text-[#1D2433]"
              }`}
              aria-label="Console"
            >
              <TerminalIcon size={13} />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-[#5F6B7A] hover:text-[#1D2433] rounded-md hover:bg-[#F0F0ED] transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>

        {/* ===== Generating Overlay ===== */}
        {isGenerating && (
          <div className="absolute inset-0 z-40 bg-[#F9F9F7]/90 flex items-center justify-center">
            <div className="text-center">
              <Loader2 size={40} className="animate-spin text-[#0079f2] mx-auto mb-4" />
              <h3 className="text-[18px] font-semibold text-[#1D2433] mb-2">Generating your app...</h3>
              <p className="text-[13px] text-[#5F6B7A]">{initialPrompt}</p>
            </div>
          </div>
        )}

        {/* ===== 3-Panel Layout ===== */}
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
            defaultSize="22"
            minSize="15"
            collapsible
            id="ai-chat"
            onResize={(size) => setAiCollapsed(size.asPercentage < 1)}
          >
            <AIChatPanel onInsertCode={handleInsertCode} activeFile={activeFile} onShadowCommit={handleShadowCommit} />
          </Panel>

          <Separator className="splitter-handle-v" />

          {/* --- Editor + Console --- */}
          <Panel defaultSize="43" minSize="25" id="editor-console">
            <Group
              orientation="vertical"
              defaultLayout={verticalLayout.defaultLayout}
              onLayoutChanged={verticalLayout.onLayoutChanged}
              className="h-full"
              id="replit-v"
            >
              {/* Editor */}
              <Panel defaultSize="70" minSize="30" id="editor">
                <div className="flex flex-col h-full bg-[#1e1e1e]">
                  {/* Tab Bar — stays dark (Monaco editor tabs) */}
                  <div className="flex items-center bg-[#252526] pl-1 overflow-x-auto shrink-0 border-b border-[#404040]">
                    {openTabs.map((tab) => {
                      const file = files[tab];
                      if (!file) return null;
                      const info = getFileInfo(tab);
                      const Icon = info.icon;
                      const isActive = activeFile === tab;
                      return (
                        <div
                          key={tab}
                          onClick={() => handleTabClick(tab)}
                          className={`group flex items-center gap-1.5 px-3 py-1.5 text-[12px] cursor-pointer shrink-0 transition-all rounded-t-lg mt-1 mx-0.5 ${
                            isActive
                              ? "bg-[#1e1e1e] text-[#e1e8f0]"
                              : "text-[#858585] hover:text-[#cccccc] hover:bg-[#2d2d2d]"
                          }`}
                        >
                          <Icon size={13} className={info.color} />
                          <span className="font-mono">{tab}</span>
                          <button
                            type="button"
                            onClick={(e) => handleTabClose(tab, e)}
                            className={`ml-1 rounded p-0.5 transition-all ${
                              isActive
                                ? "text-[#858585] hover:text-[#e1e8f0] hover:bg-[#404040]"
                                : "opacity-0 group-hover:opacity-100 hover:bg-[#404040]"
                            }`}
                            aria-label={`Close ${tab}`}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Monaco Editor */}
                  <div className="flex-1 min-h-0">
                    <Editor
                      height="100%"
                      language={files[activeFile]?.language ?? "html"}
                      value={files[activeFile]?.content ?? ""}
                      onChange={handleCodeChange}
                      theme={editorTheme}
                      options={{
                        fontSize: 13,
                        lineHeight: 22,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        padding: { top: 12 },
                        fontFamily: "var(--font-geist-mono), 'Fira Code', 'Cascadia Code', monospace",
                        fontLigatures: true,
                        wordWrap: "on",
                        tabSize: 2,
                        automaticLayout: true,
                        bracketPairColorization: { enabled: true },
                        smoothScrolling: true,
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                        renderLineHighlight: "line",
                        lineNumbers: "on",
                        glyphMargin: false,
                        folding: true,
                        links: true,
                        contextmenu: true,
                        suggest: { showMethods: true, showFunctions: true, showVariables: true, showWords: true },
                      }}
                    />
                  </div>
                </div>
              </Panel>

              <Separator className="splitter-handle-h" />

              {/* Console/Shell Panel — stays dark (terminal) */}
              <Panel
                panelRef={consolePanelRef}
                defaultSize="30"
                minSize="10"
                collapsible
                collapsedSize="0"
                id="console"
                onResize={(size) => setConsoleCollapsed(size.asPercentage < 1)}
              >
                <div className="h-full bg-[#1e1e1e] flex flex-col">
                  <div className="flex items-center border-b border-[#404040] shrink-0">
                    <div className="flex">
                      <button
                        type="button"
                        onClick={() => setConsoleTab("console")}
                        className={`px-4 py-1.5 text-[12px] font-medium transition-colors relative ${
                          consoleTab === "console" ? "text-[#e1e8f0]" : "text-[#858585] hover:text-[#cccccc]"
                        }`}
                      >
                        Console
                        {consoleTab === "console" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0079f2]" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsoleTab("shell")}
                        className={`px-4 py-1.5 text-[12px] font-medium transition-colors relative ${
                          consoleTab === "shell" ? "text-[#e1e8f0]" : "text-[#858585] hover:text-[#cccccc]"
                        }`}
                      >
                        Shell
                        {consoleTab === "shell" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0079f2]" />}
                      </button>
                    </div>
                    <div className="ml-auto flex items-center gap-1 pr-2">
                      {consoleTab === "console" && consoleLines.length > 0 && (
                        <span className="text-[10px] bg-[#0079f2]/20 text-[#0079f2] px-1.5 py-0.5 rounded-full font-mono">
                          {consoleLines.length}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => consoleTab === "console" ? setConsoleLines([]) : setShellHistory([])}
                        className="text-[#858585] hover:text-[#cccccc] p-0.5 rounded transition-colors"
                        aria-label="Clear"
                      >
                        <Trash2 size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => consolePanelRef.current?.collapse()}
                        className="text-[#858585] hover:text-[#cccccc] p-0.5 rounded transition-colors"
                        aria-label="Close"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>

                  {consoleTab === "console" ? (
                    <div className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[12px] min-h-0">
                      {consoleLines.length === 0 ? (
                        <div className="text-[#858585] py-3 italic">No console output yet...</div>
                      ) : (
                        consoleLines.map((line, i) => (
                          <div key={i} className={`flex gap-2 py-[2px] border-b border-[#333333] ${consoleColorMap[line.type]}`}>
                            <span className="text-[#858585] shrink-0 select-none">{line.time}</span>
                            <span className="break-all">{line.text}</span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[12px] min-h-0">
                        {shellHistory.map((line, i) => (
                          <div key={i} className={`py-[1px] ${line.startsWith("$") ? "text-[#00b894]" : "text-[#d4d4d4]"}`}>
                            {line}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center px-3 py-1.5 border-t border-[#404040] shrink-0">
                        <span className="text-[#00b894] text-[12px] font-mono mr-2">$</span>
                        <input
                          type="text"
                          value={shellInput}
                          onChange={(e) => setShellInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleShellSubmit(shellInput);
                          }}
                          placeholder="Type a command..."
                          className="flex-1 bg-transparent text-[12px] text-[#e1e8f0] placeholder-[#858585] outline-none font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
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
            <div className="flex flex-col h-full bg-[#F9F9F7]">
              {/* Webview header */}
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#E4E4E0] shrink-0">
                <span className="text-[12px] font-medium text-[#5F6B7A]">Webview</span>
                <div className="flex-1 flex items-center gap-1.5 bg-white rounded-xl px-3 py-1 mx-2 border border-[#E4E4E0]">
                  {vercelState === "building" ? (
                    <>
                      <Loader2 size={10} className="text-[#f59e0b] animate-spin" />
                      <span className="text-[11px] text-[#f59e0b] font-mono truncate">
                        Building... {vercelCommitMsg ? `(${vercelCommitMsg})` : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock size={10} className={vercelState === "ready" ? "text-[#00b894]" : "text-[#9DA5B0]"} />
                      <span className="text-[11px] text-[#5F6B7A] font-mono truncate">
                        {vercelUrl ?? deployedUrl ?? `https://${projectSlug ?? "preview"}.fieldnine.app`}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={handleRun}
                    className="p-1 text-[#5F6B7A] hover:text-[#1D2433] rounded transition-colors"
                    aria-label="Refresh"
                  >
                    <RefreshCw size={12} />
                  </button>
                  {(vercelUrl || deployedUrl) && (
                    <a
                      href={vercelUrl ?? deployedUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-[#5F6B7A] hover:text-[#1D2433] rounded transition-colors"
                      aria-label="Open deployed site"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* iframe */}
              <div className="flex-1 min-h-0 flex justify-center bg-white overflow-auto">
                <iframe
                  ref={iframeRef}
                  srcDoc={renderedHTML}
                  title="Live Preview"
                  className="bg-white border-0 h-full transition-all duration-300"
                  style={{ width: viewportWidths[viewport], maxWidth: "100%" }}
                  sandbox="allow-scripts allow-modals"
                />
              </div>
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
