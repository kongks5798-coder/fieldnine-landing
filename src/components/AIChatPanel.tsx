/* eslint-disable react-hooks/preserve-manual-memoization */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Sparkles,
  Copy,
  Check,
  Code2,
  Bot,
  User,
  Loader2,
  GitCommit,
  Rocket,
  FileText,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
  code?: string;
  language?: string;
  timestamp: string;
  type?: "normal" | "commit-report" | "deploy-report";
}

interface FileChange {
  path: string;
  content: string;
}

interface AIChatPanelProps {
  onInsertCode: (code: string, fileName: string) => void;
  activeFile: string;
  onShadowCommit?: (files: FileChange[], message: string) => Promise<boolean>;
  onDeployStatusChanged?: (status: string) => void;
}

/* ===== AI Response Database ===== */
const AI_RESPONSES: Record<string, { text: string; code: string; lang: string; file: string; targetPath: string }> = {
  "\uBC84\uD2BC": {
    text: "\uBA4B\uC9C4 \uADF8\uB77C\uB370\uC774\uC158 \uBC84\uD2BC\uC744 \uB9CC\uB4E4\uC5C8\uC2B5\uB2C8\uB2E4. \uC11C\uBC84\uC5D0 \uBC18\uC601\uD558\uACA0\uC2B5\uB2C8\uB2E4.",
    code: `.btn-gradient {
  padding: 14px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  position: relative;
  overflow: hidden;
}

.btn-gradient:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
}`,
    lang: "css",
    file: "style.css",
    targetPath: "public/style.css",
  },
  "\uBC30\uB108": {
    text: "\uC694\uCCAD\uD558\uC2E0 \uBC30\uB108\uB97C \uBA54\uC778 \uD654\uBA74\uC5D0 \uCD94\uAC00\uD569\uB2C8\uB2E4. \uC11C\uBC84\uC5D0 \uBC18\uC601\uD558\uACA0\uC2B5\uB2C8\uB2E4.",
    code: "",
    lang: "html",
    file: "index.html",
    targetPath: "public/index.html",
  },
  "\uB9E4\uCD9C": {
    text: "\uB9E4\uCD9C \uB2EC\uC131 \uBC30\uB108\uB97C \uBA54\uC778 \uD654\uBA74 \uC0C1\uB2E8\uC5D0 \uD06C\uAC8C \uCD94\uAC00\uD569\uB2C8\uB2E4. \uC11C\uBC84\uC5D0 \uBC18\uC601\uD558\uACA0\uC2B5\uB2C8\uB2E4.",
    code: "",
    lang: "html",
    file: "index.html",
    targetPath: "public/index.html",
  },
  "\uCE74\uB4DC": {
    text: "\uAE00\uB798\uC2A4\uBAA8\uD53C\uC998 \uCE74\uB4DC \uCEF4\uD3EC\uB10C\uD2B8\uB97C \uB9CC\uB4E4\uC5C8\uC2B5\uB2C8\uB2E4. \uC11C\uBC84\uC5D0 \uBC18\uC601\uD558\uACA0\uC2B5\uB2C8\uB2E4.",
    code: `.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 32px;
  transition: all 0.3s ease;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.glass-card h3 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  background: linear-gradient(to right, #60a5fa, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.glass-card p {
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.6;
}`,
    lang: "css",
    file: "style.css",
    targetPath: "public/style.css",
  },
  "\uB124\uBE44\uAC8C\uC774\uC158": {
    text: "\uC2A4\uD06C\uB864 \uBC18\uC751\uD615 \uB124\uBE44\uAC8C\uC774\uC158\uC744 \uB9CC\uB4E4\uC5C8\uC2B5\uB2C8\uB2E4. \uC11C\uBC84\uC5D0 \uBC18\uC601\uD558\uACA0\uC2B5\uB2C8\uB2E4.",
    code: `// Scroll-aware Navigation
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    nav.style.background = 'rgba(10, 10, 10, 0.8)';
    nav.style.backdropFilter = 'blur(20px)';
  } else {
    nav.style.background = 'transparent';
    nav.style.backdropFilter = 'none';
  }
});
console.log('Navigation initialized');`,
    lang: "javascript",
    file: "app.js",
    targetPath: "public/app.js",
  },
  "\uC560\uB2C8\uBA54\uC774\uC158": {
    text: "\uC2A4\uD06C\uB864 \uAE30\uBC18 \uD398\uC774\uB4DC\uC778 \uC560\uB2C8\uBA54\uC774\uC158\uC744 \uCD94\uAC00\uD569\uB2C8\uB2E4. \uC11C\uBC84\uC5D0 \uBC18\uC601\uD558\uACA0\uC2B5\uB2C8\uB2E4.",
    code: `// Scroll Animation System
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.card').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = \`all 0.6s ease \${i * 0.1}s\`;
  observer.observe(el);
});
console.log('Scroll animations enabled');`,
    lang: "javascript",
    file: "app.js",
    targetPath: "public/app.js",
  },
  "\uB2E4\uD06C\uBAA8\uB4DC": {
    text: "\uB2E4\uD06C/\uB77C\uC774\uD2B8 \uBAA8\uB4DC \uD1A0\uAE00\uC744 \uB9CC\uB4E4\uC5C8\uC2B5\uB2C8\uB2E4. \uC11C\uBC84\uC5D0 \uBC18\uC601\uD558\uACA0\uC2B5\uB2C8\uB2E4.",
    code: `// Dark/Light Theme Toggle
let isDark = true;
function toggleTheme() {
  isDark = !isDark;
  document.body.style.background = isDark ? '#0a0a0a' : '#ffffff';
  document.body.style.color = isDark ? '#e2e8f0' : '#1e293b';
  console.log(\`Theme: \${isDark ? 'Dark' : 'Light'}\`);
}
console.log('Theme toggle ready - call toggleTheme()');`,
    lang: "javascript",
    file: "app.js",
    targetPath: "public/app.js",
  },
  "\uD3FC": {
    text: "\uB85C\uADF8\uC778 \uD3FC\uC744 \uC0DD\uC131\uD569\uB2C8\uB2E4. \uC11C\uBC84\uC5D0 \uBC18\uC601\uD558\uACA0\uC2B5\uB2C8\uB2E4.",
    code: `<div class="glass-card" style="max-width:400px;margin:40px auto;">
  <h3 style="text-align:center;margin-bottom:24px;">\uB85C\uADF8\uC778</h3>
  <form onsubmit="handleLogin(event)">
    <div style="margin-bottom:16px;">
      <label style="display:block;font-size:13px;color:#94a3b8;margin-bottom:6px;">\uC774\uBA54\uC77C</label>
      <input type="email" placeholder="you@example.com"
        style="width:100%;padding:12px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#e2e8f0;font-size:14px;outline:none;" required />
    </div>
    <button type="submit" class="btn btn-primary" style="width:100%;">\uB85C\uADF8\uC778</button>
  </form>
</div>`,
    lang: "html",
    file: "index.html",
    targetPath: "public/index.html",
  },
};

/** Generate dynamic code based on user input */
function generateCodeForRequest(input: string): { text: string; code: string; lang: string; file: string; targetPath: string } {
  const lower = input.toLowerCase();

  for (const [key, response] of Object.entries(AI_RESPONSES)) {
    if (lower.includes(key)) {
      if ((key === "\uBC30\uB108" || key === "\uB9E4\uCD9C") && response.code === "") {
        const bannerText = input.replace(/['"]/g, "").trim();
        return {
          ...response,
          code: `<!-- AI Generated Banner -->
<section class="banner" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);padding:48px 24px;text-align:center;margin:0;position:relative;overflow:hidden;">
  <div style="position:relative;z-index:1;">
    <h2 style="font-size:clamp(28px,5vw,56px);font-weight:900;color:#fff;margin-bottom:12px;text-shadow:0 4px 20px rgba(0,0,0,0.3);letter-spacing:-1px;">${bannerText}</h2>
    <p style="font-size:18px;color:rgba(255,255,255,0.85);font-weight:500;">Field Nine\uC5D0\uC11C \uB2EC\uC131\uD55C \uC131\uACFC\uB97C \uC790\uCD95\uD569\uB2C8\uB2E4</p>
  </div>
</section>`,
        };
      }
      return response;
    }
  }

  return {
    text: `"${input}"\uC5D0 \uB300\uD55C \uCF54\uB4DC\uB97C \uC0DD\uC131\uD588\uC2B5\uB2C8\uB2E4. \uC11C\uBC84\uC5D0 \uBC18\uC601\uD558\uACA0\uC2B5\uB2C8\uB2E4.`,
    code: `/* AI Generated: ${input} */\n.ai-component {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 24px;\n  background: linear-gradient(135deg, #1e293b, #0f172a);\n  border-radius: 16px;\n  border: 1px solid rgba(255,255,255,0.06);\n  color: #e2e8f0;\n  transition: all 0.3s;\n}\n\n.ai-component:hover {\n  transform: scale(1.02);\n  border-color: rgba(59, 130, 246, 0.3);\n}`,
    lang: "css",
    file: "style.css",
    targetPath: "public/style.css",
  };
}

export default function AIChatPanel({ onInsertCode, activeFile, onShadowCommit }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      content: "\uC548\uB155\uD558\uC138\uC694, \uBCF4\uC2A4! Field Nine AI\uC785\uB2C8\uB2E4.\n\n\uAE30\uB2A5\uC744 \uC9C0\uC2DC\uD558\uC2DC\uBA74 \uCF54\uB4DC\uB97C \uC0DD\uC131\uD558\uACE0 \uC11C\uBC84\uC5D0 \uC790\uB3D9 \uBC18\uC601\uD569\uB2C8\uB2E4.\n\n\uC608\uC2DC: \"\uBC30\uB108 \uB123\uC5B4\uC918\", \"\uBC84\uD2BC \uB9CC\uB4E4\uC5B4\", \"\uCE74\uB4DC \uCEF4\uD3EC\uB10C\uD2B8\", \"\uB2E4\uD06C\uBAA8\uB4DC\"",
      timestamp: now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function now() {
    return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isCommitting]);

  const addMessage = useCallback((msg: Omit<ChatMessage, "id" | "timestamp">) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: Date.now().toString() + Math.random().toString(36).slice(2), timestamp: now() },
    ]);
  }, []);

  const shadowCommit = useCallback(
    async (fileChanges: FileChange[], commitMsg: string): Promise<boolean> => {
      if (onShadowCommit) {
        return onShadowCommit(fileChanges, commitMsg);
      }

      try {
        const res = await fetch("/api/save-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: fileChanges, message: commitMsg }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data.success === true;
      } catch {
        return false;
      }
    },
    [onShadowCommit],
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping || isCommitting) return;

    const userInput = input.trim();
    addMessage({ role: "user", content: userInput });
    setInput("");
    setIsTyping(true);

    const response = generateCodeForRequest(userInput);

    await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));

    addMessage({
      role: "ai",
      content: response.text,
      code: response.code,
      language: response.file,
    });
    setIsTyping(false);

    onInsertCode(response.code, response.file);

    setIsCommitting(true);
    addMessage({
      role: "system",
      content: "\uC11C\uBC84\uC5D0 \uCF54\uB4DC\uB97C \uBC18\uC601\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4...",
      type: "normal",
    });

    const fileChanges: FileChange[] = [
      { path: response.targetPath, content: response.code },
    ];
    const commitMsg = `feat(ai): ${userInput.slice(0, 50)}`;
    const success = await shadowCommit(fileChanges, commitMsg);

    setIsCommitting(false);

    if (success) {
      addMessage({
        role: "ai",
        content: "\uBCF4\uC2A4, \uC9C0\uC2DC\uD558\uC2E0 \uAE30\uB2A5\uC744 \uAD6C\uD604\uD558\uC5EC \uC11C\uBC84\uC5D0 \uBC18\uC601\uD588\uC2B5\uB2C8\uB2E4.",
        type: "commit-report",
      });
      addMessage({
        role: "system",
        content: `\uD83D\uDCCB \uBCC0\uACBD \uB9AC\uD3EC\uD2B8:\n\u2022 \uC218\uC815 \uD30C\uC77C: ${response.file} (${response.targetPath})\n\u2022 \uCEE4\uBC0B: ${commitMsg}\n\u2022 \uC0C1\uD0DC: \u2705 GitHub \uCEE4\uBC0B \uC644\uB8CC \u2192 Vercel \uBE4C\uB4DC \uC2DC\uC791`,
        type: "commit-report",
      });
    } else {
      addMessage({
        role: "system",
        content: "\uCF54\uB4DC\uAC00 \uC5D0\uB514\uD130\uC5D0 \uC0BD\uC785\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC11C\uBC84 \uBC18\uC601\uC740 \uD658\uACBD\uBCC0\uC218 \uC124\uC815 \uD6C4 \uC790\uB3D9\uC73C\uB85C \uD65C\uC131\uD654\uB429\uB2C8\uB2E4.",
        type: "normal",
      });
    }
  }, [input, isTyping, isCommitting, addMessage, onInsertCode, shadowCommit]);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#E4E4E0]">
      {/* Header — White theme */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F9F9F7] border-b border-[#E4E4E0] shrink-0">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#0079F2] to-[#00c2ff] flex items-center justify-center">
          <Sparkles size={10} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-[#1D2433]">AI Assistant</span>
        {isCommitting && (
          <span className="flex items-center gap-1 text-[10px] text-[#F59E0B] ml-auto">
            <Loader2 size={10} className="animate-spin" /> Committing...
          </span>
        )}
        {!isCommitting && (
          <span className="text-[10px] bg-[#00B894]/10 text-[#00B894] px-1.5 py-0.5 rounded-full ml-auto font-medium">
            Ready
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 bg-white">
        {messages.map((msg) => (
          <div key={msg.id}>
            {/* System messages */}
            {msg.role === "system" && (
              <div className={`mx-2 px-3 py-2 rounded-xl text-[11px] leading-relaxed whitespace-pre-wrap ${
                msg.type === "commit-report"
                  ? "bg-[#E6FAF5] border border-[#00B894]/20 text-[#065F46]"
                  : "bg-[#F5F5F3] border border-[#E4E4E0] text-[#5F6B7A]"
              }`}>
                {msg.type === "commit-report" && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <GitCommit size={11} className="text-[#00B894]" />
                    <span className="font-semibold text-[#00B894]">Shadow Commit</span>
                  </div>
                )}
                {msg.content}
                <div className="text-[9px] text-[#9DA5B0] mt-1 text-right">{msg.timestamp}</div>
              </div>
            )}

            {/* User / AI messages */}
            {msg.role !== "system" && (
              <div className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "ai" && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0079F2] to-[#00c2ff] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={12} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#0079F2] text-white rounded-br-sm"
                      : msg.type === "commit-report"
                      ? "bg-[#E6FAF5] border border-[#00B894]/20 text-[#065F46] rounded-bl-sm"
                      : "bg-[#F5F5F3] text-[#1D2433] rounded-bl-sm"
                  }`}
                >
                  {msg.type === "commit-report" && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Rocket size={11} className="text-[#00B894]" />
                      <span className="font-bold text-[#00B894]">{"\uBC30\uD3EC \uC644\uB8CC"}</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Code block — stays dark for readability */}
                  {msg.code && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-[#E4E4E0]">
                      <div className="flex items-center justify-between px-2 py-1 bg-[#1E1E1E]">
                        <span className="text-[10px] text-[#858585] font-mono flex items-center gap-1">
                          <FileText size={9} />
                          {msg.language}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.code!, msg.id)}
                            className="text-[#858585] hover:text-white p-0.5 transition-colors"
                            aria-label="Copy code"
                          >
                            {copiedId === msg.id ? <Check size={11} className="text-[#00B894]" /> : <Copy size={11} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => onInsertCode(msg.code!, msg.language ?? activeFile)}
                            className="flex items-center gap-1 text-[10px] bg-[#0079F2] text-white px-1.5 py-0.5 rounded hover:bg-[#0066CC] transition-colors"
                          >
                            <Code2 size={9} />
                            {"\uC0BD\uC785"}
                          </button>
                        </div>
                      </div>
                      <pre className="px-2 py-2 bg-[#0d1117] text-[11px] text-[#e6edf3] overflow-x-auto max-h-[200px] overflow-y-auto leading-5">
                        {msg.code}
                      </pre>
                    </div>
                  )}

                  <div className="text-[9px] text-[#9DA5B0] mt-1 text-right">{msg.timestamp}</div>
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-[#E4E4E0] flex items-center justify-center shrink-0 mt-0.5">
                    <User size={12} className="text-[#5F6B7A]" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0079F2] to-[#00c2ff] flex items-center justify-center shrink-0">
              <Bot size={12} className="text-white" />
            </div>
            <div className="bg-[#F5F5F3] rounded-xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#9DA5B0] animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#9DA5B0] animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#9DA5B0] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Committing indicator */}
        {isCommitting && (
          <div className="flex items-center gap-2 mx-2 px-3 py-2 bg-[#E8F2FF] rounded-xl border border-[#0079F2]/15">
            <Loader2 size={12} className="animate-spin text-[#0079F2]" />
            <span className="text-[11px] text-[#0079F2]">GitHub{"\uC5D0 \uCEE4\uBC0B \uC911"}... Vercel {"\uC790\uB3D9 \uBE4C\uB4DC \uD2B8\uB9AC\uAC70"}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input — White theme */}
      <div className="px-3 py-2.5 border-t border-[#E4E4E0] bg-[#F9F9F7] shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={"\uAE30\uB2A5\uC744 \uC9C0\uC2DC\uD558\uC138\uC694... (\uC608: \uBC30\uB108 \uB123\uC5B4\uC918)"}
            className="flex-1 bg-white text-[#1D2433] text-xs px-3 py-2 rounded-xl border border-[#E4E4E0] focus:border-[#0079F2] focus:ring-1 focus:ring-[#0079F2]/20 outline-none placeholder-[#9DA5B0] transition-all"
            disabled={isTyping || isCommitting}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isTyping || isCommitting}
            className="p-2 bg-[#0079F2] text-white rounded-xl hover:bg-[#0066CC] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Send message"
          >
            <Send size={12} />
          </button>
        </div>
        <div className="text-[9px] text-[#9DA5B0] mt-1.5 text-center">
          Field Nine AI — Shadow Commit Engine v2.0
        </div>
      </div>
    </div>
  );
}
