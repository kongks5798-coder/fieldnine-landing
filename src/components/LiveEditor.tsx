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
  GitBranch,
  AlertTriangle,
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
  <title>Field Nine OS — Apex Intelligence</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="app">
    <nav class="nav glass-panel">
      <div class="nav-brand">
        <span class="logo">&#9889;</span>
        <span class="brand-name">Field Nine <span class="version-tag">Apex</span></span>
      </div>
      <div class="model-controls">
        <select id="modelSelector" class="glass-select">
          <option value="gemini">✨ Gemini 1.5 Pro (Free)</option>
          <option value="deepseek">🧠 DeepSeek R1 (Budget)</option>
          <option value="groq">⚡ Groq Llama 3 (Fast)</option>
          <option value="openai">🤖 OpenAI GPT-4o</option>
        </select>
        <button id="apiKeyBtn" class="btn-icon" title="API Keys">🔑</button>
      </div>
      <div class="nav-actions">
        <div class="connection-status online">
          <span class="status-dot"></span>
          <span class="status-text">Online</span>
        </div>
      </div>
    </nav>
    <main class="apex-viewport">
      <div class="data-grid-bg"></div>
      <section class="intel-core glass-panel">
        <div id="avengersOverlay" class="avengers-overlay hidden">
          <div class="avengers-box">
            <div class="avengers-header">
              <span class="pulse-icon">🚨</span>
              <h3>Emergency Protocol: AVENGERS MODE</h3>
            </div>
            <div class="avengers-console" id="avengersLog"></div>
          </div>
        </div>
        <div class="core-header">
          <div class="trinity-orbit">
            <div class="orbit-inner"></div>
            <div class="orbit-ring-1"></div>
          </div>
          <h2 id="currentModelDisplay">Gemini 1.5 Pro Active</h2>
        </div>
        <div id="chatHistory" class="apex-chat"></div>
        <div class="apex-input-area">
          <textarea id="chatInput" placeholder="'에러'라고 입력하여 자율 복구 테스트..." rows="1"></textarea>
          <button id="sendBtn" class="btn-ignite">SEND</button>
        </div>
      </section>
    </main>
  </div>
  <script src="data.js"></script>
  <script src="ui.js"></script>
  <script src="Agent_Engine.js"></script>
  <script src="app.js"></script>
</body>
</html>`,
    icon: FileCode2,
  },
  "style.css": {
    name: "style.css",
    language: "css",
    content: `/* === Field Nine OS — Apex Intelligence Theme === */
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --apex-bg: #06080d;
  --apex-surface: rgba(12, 16, 28, 0.75);
  --apex-border: rgba(255,255,255,0.06);
  --apex-text: #e2e8f0;
  --apex-muted: #64748b;
  --apex-blue: #3b82f6;
  --apex-purple: #8b5cf6;
  --apex-green: #22c55e;
  --apex-red: #ef4444;
  --apex-amber: #f59e0b;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--apex-bg);
  color: var(--apex-text);
  height: 100vh;
  overflow: hidden;
}

.app { display: flex; flex-direction: column; height: 100%; }

/* --- Glass Utility --- */
.glass-panel {
  background: var(--apex-surface);
  backdrop-filter: blur(16px);
  border: 1px solid var(--apex-border);
}
.glass-select {
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--apex-border);
  color: var(--apex-text);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}
.glass-select:focus { border-color: var(--apex-blue); }

/* --- Nav --- */
.nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 20px; z-index: 10; gap: 12px;
}
.nav-brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 16px; }
.logo { font-size: 22px; background: linear-gradient(135deg, var(--apex-blue), var(--apex-purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.brand-name { white-space: nowrap; }
.version-tag {
  font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px;
  background: linear-gradient(135deg, var(--apex-blue), var(--apex-purple));
  color: white; vertical-align: middle; margin-left: 4px;
}
.model-controls { display: flex; align-items: center; gap: 8px; }
.nav-actions { display: flex; align-items: center; gap: 8px; }
.btn-icon {
  background: rgba(255,255,255,0.06); border: none; color: var(--apex-muted);
  width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; transition: all 0.2s;
}
.btn-icon:hover { background: rgba(255,255,255,0.12); color: #fff; }

.connection-status {
  display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--apex-muted);
}
.status-dot {
  width: 7px; height: 7px; border-radius: 50%; background: var(--apex-muted);
}
.connection-status.online .status-dot {
  background: var(--apex-green);
  box-shadow: 0 0 6px rgba(34,197,94,0.5);
}

/* --- Apex Viewport --- */
.apex-viewport {
  flex: 1; display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
}

.data-grid-bg {
  position: absolute; inset: 0; z-index: 0;
  background-image:
    linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 70%);
}

/* --- Intel Core (Main Card) --- */
.intel-core {
  position: relative; z-index: 1;
  width: 92%; max-width: 720px; height: 80%;
  border-radius: 20px;
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* --- Avengers Overlay --- */
.avengers-overlay {
  position: absolute; inset: 0; z-index: 50;
  background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn 0.3s ease;
}
.avengers-overlay.hidden { display: none; }
.avengers-box {
  width: 90%; max-width: 520px;
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 16px; overflow: hidden;
  background: rgba(20,0,0,0.6);
  backdrop-filter: blur(12px);
}
.avengers-header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px;
  background: rgba(239,68,68,0.1);
  border-bottom: 1px solid rgba(239,68,68,0.2);
}
.avengers-header h3 { font-size: 14px; color: #fca5a5; font-weight: 600; }
.pulse-icon { animation: pulse 1s infinite; font-size: 18px; }
.avengers-console {
  padding: 14px 18px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #94a3b8;
  max-height: 260px;
  overflow-y: auto;
  line-height: 1.7;
}
.avengers-console .line-ok { color: var(--apex-green); }
.avengers-console .line-err { color: #f87171; }
.avengers-console .line-warn { color: var(--apex-amber); }
.avengers-console .line-info { color: var(--apex-blue); }

/* --- Core Header --- */
.core-header {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--apex-border);
}
.core-header h2 { font-size: 13px; font-weight: 500; color: var(--apex-muted); }

.trinity-orbit {
  position: relative; width: 32px; height: 32px;
}
.orbit-inner {
  position: absolute; top: 50%; left: 50%;
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--apex-blue);
  box-shadow: 0 0 10px rgba(59,130,246,0.6);
  transform: translate(-50%,-50%);
}
.orbit-ring-1 {
  position: absolute; inset: 0; border-radius: 50%;
  border: 1.5px solid transparent;
  border-top-color: var(--apex-purple);
  border-right-color: var(--apex-blue);
  animation: spin 3s linear infinite;
}

/* --- Chat Area --- */
.apex-chat {
  flex: 1; overflow-y: auto; padding: 20px;
  display: flex; flex-direction: column; gap: 16px;
}
.system-init-message {
  text-align: center; padding: 24px;
}
.init-content h3 { font-size: 16px; margin-bottom: 8px; }
.init-content p { font-size: 13px; color: var(--apex-muted); }
.init-content .sub-text { font-size: 12px; margin-top: 6px; color: #475569; }

.msg { display: flex; gap: 10px; max-width: 85%; animation: fadeIn 0.3s ease; }
.msg.user { align-self: flex-end; flex-direction: row-reverse; }
.msg.ai { align-self: flex-start; }
.msg-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; shrink: 0;
}
.msg.ai .msg-avatar { background: var(--apex-blue); color: white; }
.msg.user .msg-avatar { background: #334155; color: #cbd5e1; }
.msg-bubble {
  padding: 10px 14px; border-radius: 14px; font-size: 13px; line-height: 1.6;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--apex-border);
}
.msg.user .msg-bubble {
  background: var(--apex-blue); color: white; border: none;
}
.msg-bubble .typing-dots span {
  display: inline-block; width: 5px; height: 5px; border-radius: 50%;
  background: var(--apex-muted); margin: 0 2px;
  animation: blink 1.4s infinite both;
}
.msg-bubble .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.msg-bubble .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

/* --- Input Area --- */
.apex-input-area {
  display: flex; gap: 10px; padding: 14px 18px;
  border-top: 1px solid var(--apex-border);
  background: rgba(6,8,13,0.5);
}
#chatInput {
  flex: 1; background: rgba(255,255,255,0.04);
  border: 1px solid var(--apex-border); color: white;
  border-radius: 12px; padding: 10px 14px;
  font-size: 13px; font-family: inherit;
  resize: none; outline: none;
  transition: border-color 0.2s;
}
#chatInput:focus { border-color: var(--apex-blue); }
.btn-ignite {
  background: linear-gradient(135deg, var(--apex-blue), var(--apex-purple));
  border: none; color: white; font-weight: 600; font-size: 12px;
  padding: 0 20px; border-radius: 12px; cursor: pointer;
  letter-spacing: 0.5px; transition: all 0.2s;
}
.btn-ignite:hover { transform: scale(1.03); box-shadow: 0 0 20px rgba(59,130,246,0.3); }

/* --- Animations --- */
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes blink { 0%,80%,100% { opacity: 0.2; } 40% { opacity: 1; } }

/* --- Scrollbar --- */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }`,
    icon: FileText,
  },
  "data.js": {
    name: "data.js",
    language: "javascript",
    content: `// === Apex Intelligence — Model Registry ===
window.APEX_MODELS = {
  gemini: {
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    badge: '✨',
    color: '#4285f4',
    responses: [
      '분석 완료. 요청하신 작업을 처리했습니다.',
      '멀티모달 파이프라인으로 데이터 흐름을 확인했습니다.',
      'Gemini 1.5 Pro가 128K 컨텍스트 윈도우를 활용해 결과를 도출했습니다.',
    ],
  },
  deepseek: {
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    badge: '🧠',
    color: '#00d4aa',
    responses: [
      'Chain-of-Thought 추론을 완료했습니다. 결과를 확인하세요.',
      'DeepSeek R1이 단계별 논리 분석을 수행했습니다.',
      '추론 비용 최적화: GPT-4 대비 95% 절감된 결과입니다.',
    ],
  },
  groq: {
    name: 'Groq Llama 3',
    provider: 'Groq',
    badge: '⚡',
    color: '#f55036',
    responses: [
      '초고속 추론 완료 — 응답 시간 < 100ms.',
      'LPU 가속으로 실시간 처리했습니다.',
      'Groq 인프라에서 Llama 3 70B를 통해 분석했습니다.',
    ],
  },
  openai: {
    name: 'OpenAI GPT-4o',
    provider: 'OpenAI',
    badge: '🤖',
    color: '#10a37f',
    responses: [
      'GPT-4o 멀티모달 분석이 완료되었습니다.',
      'Vision + Language 통합 추론 결과입니다.',
      'OpenAI API를 통한 최첨단 응답을 생성했습니다.',
    ],
  },
};

window.APEX_ERROR_SCENARIOS = [
  { type: 'timeout',  label: 'API Timeout',       fix: 'Failover to backup endpoint' },
  { type: 'rateLimit', label: 'Rate Limit Hit',    fix: 'Switching to budget model' },
  { type: 'parse',    label: 'Response Parse Fail', fix: 'Retry with structured output' },
  { type: 'auth',     label: 'Auth Token Expired',  fix: 'Refreshing credentials' },
];`,
    icon: FileCog,
  },
  "ui.js": {
    name: "ui.js",
    language: "javascript",
    content: `// === Apex Intelligence — UI Helpers ===

window.ApexUI = {
  /** Append a chat message to #chatHistory */
  addMessage: function(role, html) {
    var chat = document.getElementById('chatHistory');
    if (!chat) return;
    var div = document.createElement('div');
    div.className = 'msg ' + role;
    var avatarText = role === 'ai' ? 'AI' : 'U';
    div.innerHTML =
      '<div class="msg-avatar">' + avatarText + '</div>' +
      '<div class="msg-bubble">' + html + '</div>';
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
  },

  /** Show typing indicator, returns remove function */
  showTyping: function() {
    var div = this.addMessage('ai',
      '<div class="typing-dots"><span></span><span></span><span></span></div>');
    return function() { if (div && div.parentNode) div.parentNode.removeChild(div); };
  },

  /** Log a line into Avengers console */
  avengersLog: function(text, cls) {
    var log = document.getElementById('avengersLog');
    if (!log) return;
    var line = document.createElement('div');
    line.className = cls ? 'line-' + cls : '';
    line.textContent = '> ' + text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  },

  /** Show/hide Avengers overlay */
  toggleAvengers: function(show) {
    var el = document.getElementById('avengersOverlay');
    if (!el) return;
    if (show) { el.classList.remove('hidden'); }
    else { el.classList.add('hidden'); }
  },

  /** Update model display text */
  setModelDisplay: function(text) {
    var el = document.getElementById('currentModelDisplay');
    if (el) el.textContent = text;
  },

  /** Simple delay helper */
  wait: function(ms) {
    return new Promise(function(r) { setTimeout(r, ms); });
  },
};`,
    icon: FileCog,
  },
  "Agent_Engine.js": {
    name: "Agent_Engine.js",
    language: "javascript",
    content: `// === Apex Intelligence — Autonomous Agent Engine ===
// Handles: error detection, self-recovery, Avengers Mode

window.AgentEngine = (function() {
  var isRunning = false;

  /** Run Avengers Mode: animated error recovery sequence */
  async function runAvengers() {
    if (isRunning) return;
    isRunning = true;

    var UI = window.ApexUI;
    var scenarios = window.APEX_ERROR_SCENARIOS || [];
    var pick = scenarios[Math.floor(Math.random() * scenarios.length)] || {
      type: 'unknown', label: 'Unknown Error', fix: 'Generic recovery'
    };

    // Clear previous logs
    var logEl = document.getElementById('avengersLog');
    if (logEl) logEl.innerHTML = '';

    UI.toggleAvengers(true);

    UI.avengersLog('ERROR DETECTED: ' + pick.label, 'err');
    await UI.wait(600);
    UI.avengersLog('Diagnosing root cause...', 'warn');
    await UI.wait(800);
    UI.avengersLog('Type: ' + pick.type.toUpperCase(), 'info');
    await UI.wait(500);
    UI.avengersLog('Initiating autonomous recovery...', 'warn');
    await UI.wait(700);
    UI.avengersLog('Strategy: ' + pick.fix, 'info');
    await UI.wait(900);
    UI.avengersLog('Executing fix...', 'warn');
    await UI.wait(1000);
    UI.avengersLog('Verifying system integrity...', 'info');
    await UI.wait(600);
    UI.avengersLog('RECOVERY COMPLETE — All systems nominal', 'ok');

    await UI.wait(1500);
    UI.toggleAvengers(false);
    isRunning = false;

    return pick;
  }

  return { runAvengers: runAvengers };
})();`,
    icon: FileCog,
  },
  "app.js": {
    name: "app.js",
    language: "javascript",
    content: `// app.js — Real Gemini API Integration
// Safety: No setInterval/recursion. All async with try-catch. No infinite loop risk.
document.addEventListener('DOMContentLoaded', function() {
    console.log('\\u{1F680} Field Nine OS: Apex Engine Booting (Live API)...');

    var GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    var API_KEY_STORAGE = 'apex_gemini_api_key';
    var CHAT_HISTORY_KEY = 'apex_chat_history';
    var MAX_HISTORY = 20; // Conversation context limit (prevents payload bloat)
    var REQUEST_TIMEOUT_MS = 30000; // 30s max per request

    var System = {
        isSending: false,    // Duplicate send guard
        chatMemory: [],      // Gemini conversation history

        init: function() {
            this.bindEvents();
            this.loadApiKey();
            this.restoreChatMemory();
            console.log('[System] Init complete. API key:', this.getApiKey() ? 'SET' : 'NOT SET');
        },

        // ── API Key Management ──
        getApiKey: function() {
            try { return localStorage.getItem(API_KEY_STORAGE) || ''; }
            catch(e) { return ''; }
        },

        setApiKey: function(key) {
            try { localStorage.setItem(API_KEY_STORAGE, key.trim()); }
            catch(e) { console.warn('[System] localStorage unavailable'); }
        },

        loadApiKey: function() {
            if (!this.getApiKey()) {
                window.ApexUI.addMessage('ai',
                    '<strong>\\u{1F511} Gemini API \\ud0a4\\uac00 \\ud544\\uc694\\ud569\\ub2c8\\ub2e4</strong><br>' +
                    '<code>/key YOUR_API_KEY</code> \\ub97c \\uc785\\ub825\\ud558\\uba74 \\uc800\\uc7a5\\ub429\\ub2c8\\ub2e4.<br>' +
                    '<a href="https://aistudio.google.com/apikey" target="_blank" ' +
                    'style="color:#4285f4;text-decoration:underline;">Google AI Studio\\uc5d0\\uc11c \\ubc1c\\uae09</a>'
                );
            }
        },

        // ── Chat Memory (for multi-turn) ──
        restoreChatMemory: function() {
            try {
                var saved = localStorage.getItem(CHAT_HISTORY_KEY);
                if (saved) this.chatMemory = JSON.parse(saved).slice(-MAX_HISTORY);
            } catch(e) { this.chatMemory = []; }
        },

        saveChatMemory: function() {
            try {
                var trimmed = this.chatMemory.slice(-MAX_HISTORY);
                localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
            } catch(e) {}
        },

        // ── Event Binding (no recursion, no intervals) ──
        bindEvents: function() {
            var self = this;
            var sendBtn = document.getElementById('sendBtn');
            if (sendBtn) sendBtn.addEventListener('click', function() { self.handleSend(); });

            var chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        self.handleSend();
                    }
                });
            }

            var selector = document.getElementById('modelSelector');
            if (selector) {
                selector.addEventListener('change', function(e) {
                    var name = e.target.options[e.target.selectedIndex].text;
                    window.ApexUI.setModelDisplay(name + ' Active');
                });
            }
        },

        // ── Main Send Handler ──
        handleSend: async function() {
            // Guard: prevent duplicate sends
            if (this.isSending) {
                console.warn('[System] Request already in progress — blocked duplicate');
                return;
            }

            var input = document.getElementById('chatInput');
            var text = (input ? input.value.trim() : '');
            if (!text) return;

            // Slash command: /key
            if (text.startsWith('/key ')) {
                var newKey = text.slice(5).trim();
                if (newKey.length < 10) {
                    window.ApexUI.addMessage('ai', '\\u274C API \\ud0a4\\uac00 \\ub108\\ubb34 \\uc9e7\\uc2b5\\ub2c8\\ub2e4.');
                    return;
                }
                this.setApiKey(newKey);
                input.value = '';
                window.ApexUI.addMessage('ai',
                    '\\u2705 <strong>API \\ud0a4 \\uc800\\uc7a5 \\uc644\\ub8cc!</strong> \\uc774\\uc81c \\ub300\\ud654\\ub97c \\uc2dc\\uc791\\ud558\\uc138\\uc694.');
                return;
            }

            // Slash command: /clear
            if (text === '/clear') {
                this.chatMemory = [];
                this.saveChatMemory();
                var history = document.getElementById('chatHistory');
                if (history) history.innerHTML = '';
                input.value = '';
                window.ApexUI.addMessage('ai', '\\u{1F9F9} \\ub300\\ud654 \\uae30\\ub85d\\uc774 \\ucd08\\uae30\\ud654\\ub418\\uc5c8\\uc2b5\\ub2c8\\ub2e4.');
                return;
            }

            // Check API key
            var apiKey = this.getApiKey();
            if (!apiKey) {
                window.ApexUI.addMessage('ai',
                    '\\u{1F511} API \\ud0a4\\uac00 \\uc124\\uc815\\ub418\\uc9c0 \\uc54a\\uc558\\uc2b5\\ub2c8\\ub2e4. <code>/key YOUR_KEY</code> \\ub97c \\uc785\\ub825\\ud574\\uc8fc\\uc138\\uc694.');
                return;
            }

            // Show user message
            window.ApexUI.addMessage('user', this._escapeHTML(text));
            input.value = '';

            // Add to memory
            this.chatMemory.push({ role: 'user', parts: [{ text: text }] });

            // Lock sending + show typing
            this.isSending = true;
            this._setInputEnabled(false);
            var removeTyping = window.ApexUI.showTyping();

            try {
                var reply = await this._callGeminiAPI(apiKey, this.chatMemory);

                removeTyping();

                // Add AI reply to memory
                this.chatMemory.push({ role: 'model', parts: [{ text: reply }] });
                this.saveChatMemory();

                window.ApexUI.addMessage('ai', this._formatReply(reply));

            } catch (err) {
                removeTyping();
                console.error('[System] API Error:', err.message);

                // ── Avengers Mode: only on REAL errors ──
                window.ApexUI.addMessage('ai',
                    '\\u274C <strong>API \\uc624\\ub958:</strong> ' + this._escapeHTML(err.message));

                if (window.AgentEngine && typeof window.AgentEngine.runAvengers === 'function') {
                    await window.AgentEngine.runAvengers();
                }
            } finally {
                this.isSending = false;
                this._setInputEnabled(true);
                if (input) input.focus();
            }
        },

        // ── Gemini API Call (with timeout, no retry loop) ──
        _callGeminiAPI: async function(apiKey, chatHistory) {
            var url = GEMINI_API_URL + '?key=' + encodeURIComponent(apiKey);

            // Trim history to prevent payload bloat
            var trimmedHistory = chatHistory.slice(-MAX_HISTORY);

            var body = JSON.stringify({
                contents: trimmedHistory,
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 2048,
                    topP: 0.95,
                    topK: 40
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
                ]
            });

            // Timeout via AbortController (no setInterval)
            var controller = new AbortController();
            var timeoutId = setTimeout(function() { controller.abort(); }, REQUEST_TIMEOUT_MS);

            try {
                var res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: body,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!res.ok) {
                    var errBody = '';
                    try { errBody = (await res.json()).error.message; } catch(e) {}
                    throw new Error('HTTP ' + res.status + (errBody ? ': ' + errBody : ''));
                }

                var data = await res.json();

                // Extract text from Gemini response
                var candidates = data.candidates;
                if (!candidates || !candidates[0] || !candidates[0].content) {
                    var blockReason = (data.promptFeedback && data.promptFeedback.blockReason) || 'Unknown';
                    throw new Error('\\uc751\\ub2f5 \\ucc28\\ub2e8\\ub428 (reason: ' + blockReason + ')');
                }

                var parts = candidates[0].content.parts;
                var textParts = parts.map(function(p) { return p.text || ''; });
                return textParts.join('');

            } catch(err) {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') {
                    throw new Error('\\uc694\\uccad \\uc2dc\\uac04 \\ucd08\\uacfc (30\\ucd08). \\ub124\\ud2b8\\uc6cc\\ud06c\\ub97c \\ud655\\uc778\\ud558\\uc138\\uc694.');
                }
                throw err;
            }
        },

        // ── Helpers (no recursion) ──
        _escapeHTML: function(str) {
            var d = document.createElement('div');
            d.textContent = str;
            return d.innerHTML;
        },

        _formatReply: function(text) {
            // Basic markdown: **bold**, \\n→<br>, \\'code\\'
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\'([^\\']+)\\'/g, '<code>$1</code>')
                .replace(/\\n/g, '<br>');
        },

        _setInputEnabled: function(enabled) {
            var input = document.getElementById('chatInput');
            var btn = document.getElementById('sendBtn');
            if (input) { input.disabled = !enabled; }
            if (btn) {
                btn.disabled = !enabled;
                btn.textContent = enabled ? '\\u{25B6}' : '\\u23F3';
            }
        },

        addMessage: function(role, text) {
            window.ApexUI.addMessage(role, role === 'user' ? this._escapeHTML(text) : text);
        }
    };

    System.init();
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
  const [openTabs, setOpenTabs] = useState(["index.html", "style.css", "data.js", "ui.js", "Agent_Engine.js", "app.js"]);
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
      // Root file protection: prevent AI from overwriting infra dashboard files
      const PROTECTED_FILES = new Set(["index.html", "style.css", "data.js", "ui.js", "app.js"]);
      const filtered = fileChanges.filter((f) => {
        if (PROTECTED_FILES.has(f.path)) {
          console.warn(`[shadow-commit] PROTECTED: ${f.path} — root file overwrite blocked`);
          return false;
        }
        return true;
      });
      if (filtered.length === 0) return false;
      fileChanges = filtered;

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
          headers: { "Content-Type": "application/json", "X-Requested-With": "F9OS" },
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
        const PROTECTED_ROOT = new Set(["index.html", "style.css", "data.js", "ui.js", "app.js"]);
        const fileChanges = Object.entries(files)
          .filter(([name]) => !PROTECTED_ROOT.has(name))
          .map(([name, f]) => ({ path: name, content: f.content }));
        if (fileChanges.length === 0) return;
        // Fire-and-forget: don't block UI waiting for commit
        handleShadowCommit(fileChanges, "chore: auto-save code changes").catch((e) => {
          console.warn("[auto-commit] Failed:", e instanceof Error ? e.message : e);
        });
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
            // REPL eval bridge
            if (e.data && e.data.source === 'fn-repl') {
              try {
                var r = (0, eval)(e.data.code);
                _post('log', [r]);
              } catch(err) {
                _post('error', [err.message]);
              }
            }
          });
          function _serializeArg(a) {
            if (a === null) return { argType: 'null', value: 'null', preview: 'null' };
            if (a === undefined) return { argType: 'undefined', value: 'undefined', preview: 'undefined' };
            var t = typeof a;
            if (t === 'string') return { argType: 'string', value: a, preview: a.length > 100 ? a.slice(0, 100) + '...' : a };
            if (t === 'number') return { argType: 'number', value: String(a), preview: String(a) };
            if (t === 'boolean') return { argType: 'boolean', value: String(a), preview: String(a) };
            if (t === 'function') return { argType: 'function', value: '', preview: 'f ' + (a.name || 'anonymous') + '()' };
            if (Array.isArray(a)) {
              try { var s = JSON.stringify(a); return { argType: 'array', value: s, preview: String(a.length) }; }
              catch(e) { return { argType: 'array', value: '[]', preview: '0' }; }
            }
            if (t === 'object') {
              try {
                var s = JSON.stringify(a, null, 2);
                var keys = Object.keys(a);
                var p = '{' + keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', ...' : '') + '}';
                return { argType: 'object', value: s, preview: p };
              } catch(e) { return { argType: 'object', value: '{}', preview: '{...}' }; }
            }
            return { argType: 'string', value: String(a), preview: String(a) };
          }
          const _post = (type, args) => {
            try {
              var arr = Array.from(args);
              var serialized = arr.map(_serializeArg);
              window.parent.postMessage({
                source: 'fn-preview',
                type: type,
                text: arr.map(function(a) {
                  return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a);
                }).join(' '),
                args: serialized
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
      // Only accept messages from same origin or sandboxed iframes (null origin)
      if (e.origin !== "null" && e.origin !== window.location.origin) return;
      if (e.data?.source === "fn-preview") {
        const now = new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        });
        setConsoleLines((prev) => [
          ...prev.slice(-50),
          { type: e.data.type, text: e.data.text, time: now, args: e.data.args },
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
    try {
      // Truncation warning: check completeness before inserting AI code
      const ext = targetFile.split(".").pop()?.toLowerCase() ?? "";
      const lang = ext === "js" || ext === "mjs" ? "javascript" : ext === "ts" || ext === "tsx" ? "typescript" : ext;
      const check = isCodeComplete(code, lang);
      if (!check.complete) {
        addToast({ type: "error", message: `AI 코드 잘림 감지: ${targetFile} (${check.reason}) — 커밋 차단됨` });
        console.warn(`[insert-code] Truncated AI output for ${targetFile}: ${check.reason}`);
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
    } catch (err) {
      console.error("[handleInsertCode] Error:", err);
      addToast({ type: "error", message: `코드 삽입 실패: ${targetFile}` });
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
    if (lower === "ls" || lower === "ls -la" || lower === "ls -l") {
      const fileNames = Object.keys(files);
      if (lower === "ls") {
        setShellHistory((prev) => [...prev, fileNames.join("  ")]);
      } else {
        const lines = fileNames.map((f) => {
          const size = files[f]?.content?.length ?? 0;
          return `-rw-r--r--  1 user  staff  ${String(size).padStart(6)} Feb 11 12:00 ${f}`;
        });
        setShellHistory((prev) => [...prev, `total ${fileNames.length}`, ...lines]);
      }
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
    } else if (lower.startsWith("cat ")) {
      const fileName = cmd.slice(4).trim();
      const file = files[fileName];
      if (file) {
        setShellHistory((prev) => [...prev, ...file.content.split("\n")]);
      } else {
        setShellHistory((prev) => [...prev, `cat: ${fileName}: No such file or directory`]);
      }
    } else if (lower.startsWith("head ")) {
      const fileName = cmd.slice(5).trim();
      const file = files[fileName];
      if (file) {
        setShellHistory((prev) => [...prev, ...file.content.split("\n").slice(0, 10)]);
      } else {
        setShellHistory((prev) => [...prev, `head: ${fileName}: No such file or directory`]);
      }
    } else if (lower.startsWith("wc ")) {
      const fileName = cmd.slice(3).trim();
      const file = files[fileName];
      if (file) {
        const lines = file.content.split("\n").length;
        const words = file.content.split(/\s+/).filter(Boolean).length;
        const chars = file.content.length;
        setShellHistory((prev) => [...prev, `  ${lines}  ${words}  ${chars} ${fileName}`]);
      } else {
        setShellHistory((prev) => [...prev, `wc: ${fileName}: No such file or directory`]);
      }
    } else if (lower === "date") {
      setShellHistory((prev) => [...prev, new Date().toString()]);
    } else if (lower === "whoami") {
      setShellHistory((prev) => [...prev, "user"]);
    } else if (lower === "uname -a" || lower === "uname") {
      setShellHistory((prev) => [...prev, "FieldNine OS 2.0 (WebContainer/simulated) x86_64"]);
    } else if (lower === "env") {
      setShellHistory((prev) => [...prev, "NODE_ENV=development", "HOME=/home/user", "SHELL=/bin/bash", `PWD=/home/user/project`, `FILES=${Object.keys(files).length}`]);
    } else if (lower === "help") {
      setShellHistory((prev) => [...prev, "Commands: ls, cat, head, wc, pwd, echo, date, whoami, uname, env, clear, help", "Enable WebContainer for real Node.js runtime."]);
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
      <div className="hidden md:flex w-12 bg-[var(--r-surface)]/70 backdrop-blur-xl flex-col items-center py-3 border-r border-[var(--r-border)]/50 shrink-0">
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
        <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 bg-[var(--r-surface)]/80 backdrop-blur-xl border-b border-[var(--r-border)]/50 shrink-0 overflow-x-auto">
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
          <div className="flex items-center bg-[var(--r-surface)]/80 backdrop-blur-xl border-b border-[var(--r-border)]/50 shrink-0 md:hidden">
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
                    sandbox="allow-scripts allow-forms"
                  />
                </div>
              </div>
            )}

            {mobilePanel === "console" && (
              <div className="flex-1 min-h-0">
                <ConsolePanel consoleTab={consoleTab} setConsoleTab={setConsoleTab} consoleLines={consoleLines} setConsoleLines={setConsoleLines} consoleFilter={consoleFilter} setConsoleFilter={setConsoleFilter} shellHistory={shellHistory} setShellHistory={setShellHistory} shellInput={shellInput} setShellInput={setShellInput} handleShellSubmit={handleShellSubmit} gitHistory={gitHistory} gitLoading={gitLoading} fetchGitHistory={fetchGitHistory} restoringCommit={restoringCommit} handleGitRestore={handleGitRestore} onCollapse={() => setMobilePanel("editor")} onAIFix={handleAIFix} iframeRef={iframeRef} wcEnabled={wcEnabled} onWcToggle={() => setWcEnabled((v) => !v)} wcStatus={wcStatus} wcShellProcess={wcShellProcess} />
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
              <div className="relative h-full overflow-hidden bg-[#0d1117]">
                {/* Gradient Mesh Background */}
                <div className="absolute inset-0 pointer-events-none z-0">
                  <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-[#0079f2]/8 rounded-full blur-[120px]" />
                  <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-[#8b5cf6]/8 rounded-full blur-[100px]" />
                  <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-[#00b894]/6 rounded-full blur-[80px]" />
                </div>
              <Group
                orientation="vertical"
                defaultLayout={verticalLayout.defaultLayout}
                onLayoutChanged={verticalLayout.onLayoutChanged}
                className="h-full relative z-[1]"
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
                      iframeRef={iframeRef}
                      wcEnabled={wcEnabled}
                      onWcToggle={() => setWcEnabled((v) => !v)}
                      wcStatus={wcStatus}
                      wcShellProcess={wcShellProcess}
                    />
                  </ErrorBoundary>
                </Panel>
              </Group>
              </div>
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

        {/* ===== Global IDE Status Bar ===== */}
        {!isMobile && (
          <div className="flex items-center justify-between h-[22px] bg-[#007ACC]/50 backdrop-blur-xl border-t border-[#007ACC]/20 text-white text-[11px] px-2 shrink-0 select-none font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <GitBranch size={11} />
                main
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-[7px] h-[7px] rounded-full ${
                  isSyncing ? "bg-[#fbbf24] animate-pulse" :
                  showSynced ? "bg-[#3fb950]" :
                  "bg-[#3fb950]"
                }`} />
                {isSyncing ? "Syncing" : "Synced"}
              </span>
              {consoleLines.filter((l) => l.type === "error").length > 0 && (
                <span className="flex items-center gap-1 bg-white/15 px-1.5 py-[1px] rounded">
                  <AlertTriangle size={10} />
                  {consoleLines.filter((l) => l.type === "error").length}
                </span>
              )}
              {consoleLines.filter((l) => l.type === "warn").length > 0 && (
                <span className="flex items-center gap-1 text-white/80">
                  {consoleLines.filter((l) => l.type === "warn").length} warnings
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span>{Object.keys(files).length} files</span>
              <span>UTF-8</span>
              <span>Spaces: 2</span>
            </div>
          </div>
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
