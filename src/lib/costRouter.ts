/**
 * Cost Router — API cost optimization module
 *
 * Strategy 1: Response caching (pgvector similarity search)
 * Strategy 2: Model routing (simple → GPT-4o-mini, complex → Claude/GPT-4o)
 * Strategy 4: Local template library (zero-cost instant responses)
 * Strategy 5: Daily usage limit tracking
 */

import { searchMemories, isMemoryEnabled } from "./supabaseMemory";

// ===== Strategy 2: Complexity Classifier =====

const SIMPLE_PATTERNS = [
  /색.*바꿔|색상.*변경|color.*change/i,
  /텍스트.*수정|글자.*바꿔|text.*edit/i,
  /설명.*해|뭐야|what is/i,
  /크기.*조절|사이즈|size|font/i,
  /간격|padding|margin|gap/i,
  /보여줘|알려줘|explain/i,
  /추가.*해줘|넣어줘|add.*please/i,
  /삭제.*해줘|지워줘|remove|delete/i,
  /배경.*바꿔|background/i,
  /버튼.*색|글씨.*색/i,
  /정렬|align|center/i,
  /둥글게|border.*radius|rounded/i,
];

export function classifyComplexity(message: string): "simple" | "complex" {
  if (message.length < 30) return "simple";
  for (const p of SIMPLE_PATTERNS) {
    if (p.test(message)) return "simple";
  }
  return "complex";
}

export function selectModel(
  complexity: "simple" | "complex",
  userModel: string,
  provider: string = "anthropic",
): string {
  // User explicitly picked a model → respect it
  if (userModel !== "auto") return userModel;
  // Auto routing: simple → cheap model matching provider, complex → default
  if (complexity === "simple") {
    return provider === "openai" ? "gpt-4o-mini" : "claude-sonnet";
  }
  return "auto";
}

// ===== Strategy 1: Cached Response Lookup =====

export async function findCachedResponse(
  query: string,
  projectId: string = "default",
): Promise<string | null> {
  if (!isMemoryEnabled()) return null;
  try {
    const results = await searchMemories(projectId, query, 1, 0.85);
    if (results.length > 0 && results[0].memory.type === "conversation") {
      const cached = results[0].memory.content;
      const aiPart = cached.split("\n\nAI: ")[1];
      if (aiPart && aiPart.length > 50) return aiPart;
    }
  } catch (e) {
    console.warn("[costRouter] Cache lookup failed:", e instanceof Error ? e.message : e);
  }
  return null;
}

// ===== Strategy 4: Template Library =====

interface Template {
  match: RegExp;
  response: string;
  code: Record<string, string>;
}

const TEMPLATES: Template[] = [
  {
    match: /빨간.*버튼|red.*button/i,
    response: "빨간 버튼을 추가했습니다.",
    code: {
      "style.css": `.btn-red { background: #ef4444; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; transition: background 0.3s ease; }
.btn-red:hover { background: #dc2626; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }`,
    },
  },
  {
    match: /다크\s*모드|dark\s*mode/i,
    response: "다크 모드 토글을 추가했습니다.",
    code: {
      "style.css": `body.dark { background: #0a0a0a; color: #e2e8f0; }
body.dark .card { background: #1a1a2e; border-color: #2d2d44; }
.dark-toggle { position: fixed; top: 16px; right: 16px; padding: 8px 16px; border-radius: 8px; border: 1px solid #333; background: #1a1a2e; color: #e2e8f0; cursor: pointer; z-index: 1000; }`,
      "app.js": `document.addEventListener('DOMContentLoaded', function() {
  var toggle = document.getElementById('darkToggle');
  if (toggle) {
    toggle.addEventListener('click', function() {
      document.body.classList.toggle('dark');
      toggle.textContent = document.body.classList.contains('dark') ? '☀️ Light' : '🌙 Dark';
    });
  }
});`,
    },
  },
  {
    match: /카드\s*그리드|card\s*grid|카드.*레이아웃/i,
    response: "카드 그리드 레이아웃을 추가했습니다.",
    code: {
      "style.css": `.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; padding: 24px; }
.card { background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb; transition: transform 0.3s ease, box-shadow 0.3s ease; }
.card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
.card h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.card p { color: #6b7280; line-height: 1.6; }`,
    },
  },
  {
    match: /네비게이션|nav\s*bar|메뉴\s*바|상단.*메뉴/i,
    response: "네비게이션 바를 추가했습니다.",
    code: {
      "style.css": `.navbar { display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 60px; background: #fff; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; z-index: 100; }
.navbar .logo { font-size: 20px; font-weight: 700; color: #1d2433; }
.navbar .nav-links { display: flex; gap: 24px; list-style: none; }
.navbar .nav-links a { color: #6b7280; text-decoration: none; font-size: 14px; transition: color 0.2s; }
.navbar .nav-links a:hover { color: #0079F2; }`,
    },
  },
  {
    match: /로그인.*폼|login.*form|로그인.*페이지/i,
    response: "로그인 폼을 추가했습니다.",
    code: {
      "style.css": `.login-form { max-width: 400px; margin: 80px auto; padding: 32px; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
.login-form h2 { text-align: center; margin-bottom: 24px; font-size: 24px; }
.login-form input { width: 100%; padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; margin-bottom: 16px; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
.login-form input:focus { border-color: #0079F2; }
.login-form button { width: 100%; padding: 12px; background: #0079F2; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.login-form button:hover { background: #0066CC; }`,
    },
  },
];

export function findTemplate(message: string): { response: string; code: Record<string, string> } | null {
  for (const t of TEMPLATES) {
    if (t.match.test(message)) return { response: t.response, code: t.code };
  }
  return null;
}

/** Format template result as AI-style response with code blocks */
export function formatTemplateResponse(
  template: { response: string; code: Record<string, string> },
): string {
  let result = template.response + "\n\n";
  for (const [file, code] of Object.entries(template.code)) {
    const lang = file.endsWith(".html") ? "html" : file.endsWith(".css") ? "css" : "javascript";
    const comment = file.endsWith(".html")
      ? `<!-- target: ${file} -->`
      : file.endsWith(".css")
        ? `/* target: ${file} */`
        : `// target: ${file}`;
    result += `\`\`\`${lang}\n${comment}\n${code}\n\`\`\`\n\n`;
  }
  return result.trim();
}

// ===== Strategy 5: Daily Usage Limit =====

interface DailyUsage {
  count: number;
  date: string;
}

const dailyUsage = new Map<string, DailyUsage>();

// Cleanup old entries every hour
setInterval(() => {
  const today = new Date().toISOString().slice(0, 10);
  for (const [key, usage] of dailyUsage) {
    if (usage.date !== today) dailyUsage.delete(key);
  }
}, 60 * 60 * 1000);

export interface DailyLimitResult {
  allowed: boolean;
  forceMinModel: boolean;
  count: number;
  limit: number;
}

const DAILY_LIMIT = 100;

export function checkDailyLimit(sessionId: string): DailyLimitResult {
  const today = new Date().toISOString().slice(0, 10);
  const usage = dailyUsage.get(sessionId);

  if (!usage || usage.date !== today) {
    dailyUsage.set(sessionId, { count: 1, date: today });
    return { allowed: true, forceMinModel: false, count: 1, limit: DAILY_LIMIT };
  }

  usage.count++;

  if (usage.count > DAILY_LIMIT) {
    return { allowed: false, forceMinModel: false, count: usage.count, limit: DAILY_LIMIT };
  }
  if (usage.count > DAILY_LIMIT / 2) {
    return { allowed: true, forceMinModel: true, count: usage.count, limit: DAILY_LIMIT };
  }
  return { allowed: true, forceMinModel: false, count: usage.count, limit: DAILY_LIMIT };
}

/** Get current usage without incrementing */
export function getDailyUsage(sessionId: string): { count: number; limit: number } {
  const today = new Date().toISOString().slice(0, 10);
  const usage = dailyUsage.get(sessionId);
  if (!usage || usage.date !== today) return { count: 0, limit: DAILY_LIMIT };
  return { count: usage.count, limit: DAILY_LIMIT };
}

// ===== Strategy 3: Simple System Prompt =====

export const SIMPLE_SYSTEM_PROMPT = `You are Field Nine AI — a web app code assistant.
Modify the user's HTML/CSS/JS files. Use vanilla JS (var, function declarations).
Target files: index.html, style.css, data.js, ui.js, app.js.
Reply in Korean. Output code blocks with target comments:
HTML: <!-- target: index.html -->  CSS: /* target: style.css */  JS: // target: filename.ext
Output COMPLETE file contents in each code block. Never partial snippets.
Use addEventListener (never inline onclick). Guard DOM queries with if(el).
KEEP EACH JS FILE SHORT (under 35 lines).
HTML must include <meta charset="UTF-8"> and lang="ko".
CSS must use font-family: 'Inter', 'Noto Sans KR', sans-serif for Korean text.
index.html must include: <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap" />`;

// ===== Strategy 3: File Context Reducer =====

/** For simple requests, only send relevant files instead of all 5 */
export function selectRelevantFiles(
  message: string,
  files: Record<string, string>,
  complexity: "simple" | "complex",
): Record<string, string> {
  if (complexity === "complex") return files;

  const relevant: Record<string, string> = {};
  const msg = message.toLowerCase();

  // Always include HTML as reference
  if (files["index.html"]) relevant["index.html"] = files["index.html"];

  // CSS-related request
  if (/색|color|배경|background|크기|size|font|간격|padding|margin|정렬|align|둥글|radius|스타일|style|css/i.test(msg)) {
    if (files["style.css"]) relevant["style.css"] = files["style.css"];
  }

  // JS-related request
  if (/버튼|button|클릭|click|이벤트|event|함수|function|기능|동작|js/i.test(msg)) {
    if (files["app.js"]) relevant["app.js"] = files["app.js"];
    if (files["ui.js"]) relevant["ui.js"] = files["ui.js"];
    if (files["data.js"]) relevant["data.js"] = files["data.js"];
  }

  // If nothing matched, include CSS + app.js as defaults
  if (Object.keys(relevant).length <= 1) {
    if (files["style.css"]) relevant["style.css"] = files["style.css"];
    if (files["app.js"]) relevant["app.js"] = files["app.js"];
  }

  return relevant;
}
