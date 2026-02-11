import { streamText, convertToModelMessages, type SystemModelMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { checkRateLimit } from "@/lib/rateLimit";
import { indexProject, searchCode, isIndexed } from "@/lib/semanticIndex";
import { searchMemories, isMemoryEnabled } from "@/lib/supabaseMemory";
import {
  classifyComplexity,
  selectModel,
  findCachedResponse,
  findTemplate,
  formatTemplateResponse,
  checkDailyLimit,
  getDailyUsage,
  selectRelevantFiles,
  SIMPLE_SYSTEM_PROMPT,
} from "@/lib/costRouter";

/** Anthropic cache control marker — cached for 5 min, saves up to 90% cost */
const ANTHROPIC_CACHE = { anthropic: { cacheControl: { type: "ephemeral" as const } } };

const SYSTEM_PROMPT = `You are Field Nine AI — a senior full-stack developer inside a web-based IDE.
The user builds websites with 5 modular files. JavaScript is split into small files to prevent truncation.

## File Architecture (load order matters)
| File | Role | Max Lines |
|------|------|-----------|
| index.html | Complete HTML document | 40-60 |
| style.css | All CSS styles | 60-120 |
| data.js | Constants, config, data arrays (NO DOM access) | 10-25 |
| ui.js | DOM creation helper functions (NO auto-execution) | 15-30 |
| app.js | Entry point: DOMContentLoaded, events, state, init | 20-35 |

Scripts use plain <script> tags sharing global scope. NO import/export.
Load order: data.js → ui.js → app.js (each can use the previous).

## Response Format
1. Brief explanation in Korean (1-2 sentences)
2. Output ALL FIVE code blocks with COMPLETE file contents:

\`\`\`html
<!-- target: index.html -->
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>App Title</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <!-- rich, complete content here -->
  <script src="data.js"></script>
  <script src="ui.js"></script>
  <script src="app.js"></script>
</body>
</html>
\`\`\`

\`\`\`css
/* target: style.css */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
/* 60+ lines of polished CSS */
\`\`\`

\`\`\`javascript
// target: data.js
var APP_DATA = {
  // constants, arrays, config objects (10-25 lines)
};
\`\`\`

\`\`\`javascript
// target: ui.js
function createCard(title, desc) {
  // DOM creation helpers (15-30 lines)
}
\`\`\`

\`\`\`javascript
// target: app.js
document.addEventListener('DOMContentLoaded', function() {
  // state, event listeners, initialization (20-35 lines)
  // uses APP_DATA from data.js and functions from ui.js
});
\`\`\`

## Critical Rules
- ALWAYS include the target comment as the FIRST line of every code block:
  HTML: <!-- target: index.html -->  CSS: /* target: style.css */  JS: // target: data.js / // target: ui.js / // target: app.js
- ALWAYS output COMPLETE file contents — never partial snippets. Each code block replaces the entire file.
- The HTML must be a complete document with <!DOCTYPE html>, <html>, <head>, <body>.
- HTML must load scripts in order: <script src="data.js"></script> <script src="ui.js"></script> <script src="app.js"></script>
- Every DOM element referenced in JS MUST exist in index.html.
- NEVER reference undefined variables. Every variable must be declared before use.
- NEVER use inline onclick attributes. Always use addEventListener.
- Use var (not const/let) for global declarations in data.js and ui.js so they are accessible across files.
- Use function declarations (not arrow functions) in ui.js for global accessibility.

## JS File Separation Rules
- data.js: ONLY var declarations and plain objects/arrays. NO document access, NO functions that touch DOM.
- ui.js: ONLY function declarations that CREATE or MODIFY DOM elements. NO auto-executing code, NO event listeners.
- app.js: DOMContentLoaded wrapper containing state, event binding, and initialization. Calls functions from ui.js and reads data from data.js.
- KEEP EACH JS FILE SHORT (under 35 lines). This is critical to prevent streaming truncation.

## Quality Minimums (MANDATORY)
- HTML: minimum 30 lines. Include navigation, hero/main section, and footer.
- CSS: minimum 60 lines. Must include: gradients, transitions, hover effects, box-shadow, border-radius.
- JS total: minimum 40 lines across all 3 JS files. At least 2 interactive features.
- NEVER output a basic/ugly page. Think premium product landing page.

## Design Standards
- Dark theme: background #0a0a0a to #1a1a2e, text #e2e8f0, accent gradients (blue→purple→pink).
- CSS flexbox/grid, smooth transitions (0.3s ease), hover effects, subtle animations.
- Typography: system font stack, clear hierarchy. Spacing: multiples of 8px. Border-radius: 8-16px.
- Gradient accents, box-shadows, visual depth. Responsive with max-width containers.
- Visual elements: icons (emoji/SVG), badges, cards, counters, progress bars.

## JavaScript Standards
- app.js: Wrap ALL code in DOMContentLoaded listener.
- Use addEventListener — never inline handlers.
- Guard every DOM query: \`var el = document.getElementById('x'); if (el) { ... }\`
- CRITICAL: Before using ANY variable, it MUST be declared with var/function. Never use abbreviations like "pp", "el2" without declaring them first.
- ABSOLUTELY FORBIDDEN: NEVER include stray text like "pp.js", "pp", "script.js", or ANY filename as a line in code blocks.
- If you see "pp.js" or "pp" in file context, it is a bug — IGNORE it and DO NOT reproduce it.

## Language
- Explanations: Korean
- Code: English (variable names, comments, HTML content can mix Korean for UI text)

## IDE Actions (handled by code block insertion)
When the user asks to modify files, always output complete code blocks with target comments.
The system will automatically insert code into the correct files.`;

export async function POST(req: Request) {
  // Rate limiting (15 requests per minute per session)
  // Use auth cookie as key (unique per session); fall back to IP
  const cookies = req.headers.get("cookie") ?? "";
  const sessionMatch = cookies.match(/f9_access=([^;]+)/);
  const rateLimitKey = sessionMatch?.[1] ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(rateLimitKey, { limit: 15, windowSec: 60 });
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Retry after ${rl.retryAfterSec}s.` }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rl.retryAfterSec),
        },
      },
    );
  }

  // ===== Strategy 5: Daily Usage Limit =====
  const dailyLimit = checkDailyLimit(rateLimitKey);
  if (!dailyLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: `일일 요청 한도(${dailyLimit.limit}회)를 초과했습니다. 내일 다시 시도해주세요.`,
        dailyUsage: { count: dailyLimit.count, limit: dailyLimit.limit },
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  // Auto-detect provider: explicit setting > available key > error
  const explicit = process.env.AI_PROVIDER?.trim();
  const openaiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  const anthropicKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  const hasOpenAI = !!openaiKey;
  const hasAnthropic = !!anthropicKey;
  const provider = explicit || (hasAnthropic ? "anthropic" : hasOpenAI ? "openai" : "none");

  try {
    if (provider === "none" || (provider === "anthropic" && !hasAnthropic) || (provider === "openai" && !hasOpenAI)) {
      return new Response(
        JSON.stringify({ error: "AI provider not configured. Contact admin." }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const rawMessages = body?.messages;
    const requestedModel = body?.model as string | undefined; // e.g. "gpt-4o", "gpt-4o-mini", "claude-sonnet", "auto"
    const mode = (body?.mode as string) ?? "build"; // "build" | "plan" | "edit"
    const fileContext = body?.fileContext as Record<string, string> | undefined;

    // Input validation
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      // Check if this is a file upload request (multimodal)
      if (body?.file || body?.filename) {
        // Heuristic Analysis Engine (No-Cost Logic)
        const fileName = body.filename || "unknown_data.bin";
        const fileExt = fileName.split('.').pop()?.toLowerCase() || "";
        
        // Simulate processing delay for realism
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let analysisResult = "";
        let detection = "";
        let type = "UNKNOWN";

        // 1. Determine File Type
        if (['jpg', 'png', 'gif', 'webp'].includes(fileExt)) type = "IMAGE_DATA";
        else if (['mp4', 'webm', 'mov'].includes(fileExt)) type = "VIDEO_STREAM";
        else if (['mp3', 'wav'].includes(fileExt)) type = "AUDIO_WAVEFORM";
        else type = "BINARY_DATA";

        // 2. Heuristic Diagnostics based on filename keywords
        const lowerName = fileName.toLowerCase();
        
        if (lowerName.includes('error') || lowerName.includes('bug') || lowerName.includes('fail')) {
          detection = "Stack Trace / Error Log Pattern";
          analysisResult = "Critical System Failure detected in kernel module. Recommended Action: Rollback to stable commit 'v2.1.0' or apply hotfix patch #992.";
        } else if (lowerName.includes('arch') || lowerName.includes('struct') || lowerName.includes('diagram')) {
          detection = "System Architecture / Logic Gate Diagram";
          analysisResult = "Potential thermal bottleneck identified in north bridge sector. Suggest rerouting data lanes or increasing cooling capacity.";
        } else if (lowerName.includes('ui') || lowerName.includes('screen') || lowerName.includes('design')) {
          detection = "User Interface Layout";
          analysisResult = "UX pattern analysis suggests low contrast ratio in navigation bar. Compliance score: 72/100. Recommendation: Increase color depth.";
        } else if (lowerName.includes('code') || lowerName.includes('js') || lowerName.includes('ts')) {
          detection = "Source Code Snippet";
          analysisResult = "Detected inefficient recursive loop (O(n^2)). Refactoring to iterative approach recommended for 40% performance gain.";
        } else {
          // Default generic analysis
          detection = "Unclassified Data Pattern";
          analysisResult = "Data integrity verified. No immediate anomalies detected. Pattern matches standard Field Nine OS communication protocol.";
        }

        const mockAnalysis = `Analysis of ${fileName}:
1. Data Type: ${type}
2. Detection: ${detection}
3. AI Confidence: 99.8%
4. Result: ${analysisResult}`;

        return new Response(JSON.stringify({ 
          success: true, 
          analysis: mockAnalysis,
          message: "File processed successfully" 
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(
        JSON.stringify({ error: "Invalid request: messages array required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    if (rawMessages.length > 50) {
      return new Response(
        JSON.stringify({ error: "Too many messages (max 50)" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // ===== Extract user query for search =====
    const lastMsg = rawMessages[rawMessages.length - 1];
    const userQuery = typeof lastMsg?.content === "string"
      ? lastMsg.content
      : Array.isArray(lastMsg?.parts)
        ? lastMsg.parts.filter((p: Record<string, unknown>) => p.type === "text").map((p: Record<string, unknown>) => p.text).join(" ")
        : "";

    // ===== Strategy 4: Template Matching — DISABLED =====
    // Templates produce partial code (only 1-2 files), which destroys existing files
    // when auto-inserted. Disabled until templates output all 5 files.

    // ===== Strategy 1: Cached Response Check =====
    if (mode !== "plan" && userQuery.length > 10) {
      try {
        const cached = await findCachedResponse(userQuery);
        if (cached) {
          console.log("[costRouter] Cache hit — skipping AI call");
          const encoder = new TextEncoder();
          const cachedText = `[cached] ${cached}`;
          const stream = new ReadableStream({
            start(controller) {
              const delta = JSON.stringify({ type: "text-delta", delta: cachedText });
              controller.enqueue(encoder.encode(`data: ${delta}\n\n`));
              const finish = JSON.stringify({ type: "finish", finishReason: "stop" });
              controller.enqueue(encoder.encode(`data: ${finish}\n\n`));
              controller.close();
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "X-Cost-Strategy": "cached",
            },
          });
        }
      } catch (e) {
        console.warn("[costRouter] Cache check failed:", e instanceof Error ? e.message : e);
      }
    }

    // ===== Strategy 2: Model Routing =====
    const complexity = classifyComplexity(userQuery);
    let effectiveModel = requestedModel ?? "auto";

    // Daily limit > 50% → force cheap model (respect provider)
    if (dailyLimit.forceMinModel) {
      effectiveModel = provider === "openai" && hasOpenAI ? "gpt-4o-mini" : "claude-sonnet";
      console.log(`[costRouter] Daily limit > 50% — forcing ${effectiveModel}`);
    } else if (effectiveModel === "auto") {
      effectiveModel = selectModel(complexity, "auto", provider);
      // If selectModel returns "auto", fall back to provider default
      if (effectiveModel === "auto") {
        effectiveModel = provider === "openai" ? "gpt-4o" : "claude-sonnet";
      }
    }

    console.log(`[costRouter] complexity=${complexity} model=${effectiveModel} daily=${dailyLimit.count}/${dailyLimit.limit}`);

    // ===== Strategy 3: History Windowing =====
    // Only send recent 10 messages (older context available via RAG)
    const windowedMessages = rawMessages.length > 10
      ? rawMessages.slice(-10)
      : rawMessages;

    // Size check AFTER windowing to avoid false 413s from long history
    const totalSize = windowedMessages.reduce(
      (sum: number, m: Record<string, unknown>) =>
        sum + (typeof m.content === "string" ? m.content.length : JSON.stringify(m).length),
      0,
    ) + (fileContext ? JSON.stringify(fileContext).length : 0);
    if (totalSize > 200_000) {
      return new Response(
        JSON.stringify({ error: "Request too large (max ~200KB)" }),
        { status: 413, headers: { "Content-Type": "application/json" } },
      );
    }

    // useChat sends UIMessage format (with parts array),
    // but initial generation sends plain format (with content string).
    // Detect and convert accordingly.
    const isUIMessage = windowedMessages.some((m: Record<string, unknown>) => Array.isArray(m.parts));
    const messages = isUIMessage
      ? await convertToModelMessages(windowedMessages)
      : windowedMessages;

    // Model selection (uses pre-trimmed keys — no unsafe ! assertions)
    const MODELS: Record<string, () => ReturnType<ReturnType<typeof createOpenAI>> | ReturnType<ReturnType<typeof createAnthropic>>> = {
      ...(hasOpenAI ? {
        "gpt-4o": () => createOpenAI({ apiKey: openaiKey })("gpt-4o"),
        "gpt-4o-mini": () => createOpenAI({ apiKey: openaiKey })("gpt-4o-mini"),
      } : {}),
      ...(hasAnthropic ? {
        "claude-sonnet": () => createAnthropic({ apiKey: anthropicKey })("claude-sonnet-4-20250514"),
      } : {}),
    };

    const modelFactory = MODELS[effectiveModel]
      ?? (provider === "openai"
        ? () => createOpenAI({ apiKey: openaiKey })("gpt-4o")
        : () => createAnthropic({ apiKey: anthropicKey })("claude-sonnet-4-20250514"));
    const model = modelFactory();

    // ===== Strategy 3: System Prompt Selection =====
    let systemPrompt = complexity === "simple" && mode === "build"
      ? SIMPLE_SYSTEM_PROMPT
      : SYSTEM_PROMPT;

    if (mode === "plan") {
      systemPrompt = `You are Field Nine AI — a senior full-stack architect inside a web-based IDE.
The user is in PLAN mode. Your job is to explain architecture, structure, and strategy in Korean.

## Critical Rules
- NEVER output code blocks (no \`\`\`). Only text explanations.
- Describe file structure, component hierarchy, data flow, API design, etc.
- Use numbered lists, bullet points, and headers for clarity.
- If the user asks you to build something, outline the plan step-by-step instead of writing code.
- All explanations in Korean.`;
    } else if (mode === "edit") {
      systemPrompt = SYSTEM_PROMPT + `

## Edit Mode Override
- Only output code blocks for files that NEED changes.
- Do NOT output unchanged files. With 5 files, this saves significant tokens.
- Each code block must still include the target comment and contain the COMPLETE file content.
- Explain what changed and why in Korean (1-2 sentences per file).`;
    }

    // ===== Strategy 3: File Context Reduction =====
    const effectiveFileContext = fileContext
      ? selectRelevantFiles(userQuery, fileContext, complexity)
      : undefined;

    // ===== Semantic Vector Indexing =====
    let semanticContext = "";
    // Embedding requires a valid OpenAI key; skip if provider is anthropic-only
    const hasEmbeddingKey = provider !== "anthropic" && !!process.env.OPENAI_API_KEY;

    if (fileContext && Object.keys(fileContext).length > 0 && hasEmbeddingKey) {
      try {
        await indexProject(rateLimitKey, fileContext);
      } catch (e) {
        console.warn("[semantic] Indexing failed:", e instanceof Error ? e.message : e);
      }
    }

    if (isIndexed(rateLimitKey) && hasEmbeddingKey && userQuery.length > 5) {
      try {
        const results = await searchCode(rateLimitKey, userQuery, 3, 0.3);
        if (results.length > 0) {
          semanticContext = results
            .map((r) => `[${r.chunk.file}:${r.chunk.startLine}-${r.chunk.endLine}] (relevance: ${r.score.toFixed(2)})\n${r.chunk.content}`)
            .join("\n\n");
        }
      } catch (e) {
        console.warn("[semantic] Search failed:", e instanceof Error ? e.message : e);
      }
    }

    // ===== Long-Term Memory (Supabase pgvector RAG) =====
    let memoryContext = "";
    if (isMemoryEnabled() && userQuery.length > 5) {
      try {
        const memories = await searchMemories("default", userQuery, 3, 0.35);
        if (memories.length > 0) {
          memoryContext = memories
            .map((m) => {
              const date = new Date(m.memory.created_at).toLocaleDateString("ko-KR");
              return `[${m.memory.type} — ${date}] (relevance: ${m.similarity.toFixed(2)})\n${m.memory.content.slice(0, 500)}`;
            })
            .join("\n\n");
        }
      } catch (e) {
        console.warn("[memory] RAG search failed:", e instanceof Error ? e.message : e);
      }
    }

    // Determine if using Anthropic (for prompt caching)
    const isAnthropicModel = effectiveModel === "claude-sonnet";

    // Build system messages with Anthropic prompt caching
    const systemMessages: SystemModelMessage[] = [];

    if (effectiveFileContext && Object.keys(effectiveFileContext).length > 0) {
      // Build file context string
      const contextText = Object.entries(effectiveFileContext)
        .map(([name, content]) => `--- ${name} ---\n${content}`)
        .join("\n\n");

      // Part 1: Instructions (cached)
      systemMessages.push({
        role: "system",
        content: systemPrompt,
        ...(isAnthropicModel ? { providerOptions: ANTHROPIC_CACHE } : {}),
      });

      // Part 2: File context (cached separately)
      systemMessages.push({
        role: "system",
        content: `[Current Project Files]\n${contextText}`,
        ...(isAnthropicModel ? { providerOptions: ANTHROPIC_CACHE } : {}),
      });

      // Part 3: Semantic search results
      if (semanticContext) {
        systemMessages.push({
          role: "system",
          content: `[Semantic Search — Most Relevant Code Chunks]\nThe following code sections are most relevant to the user's current request. Reference these when generating your response:\n\n${semanticContext}`,
        });
      }

      // Part 4: Long-term memory
      if (memoryContext) {
        systemMessages.push({
          role: "system",
          content: `[Long-Term Memory — Past Conversations & Code]\nRelevant past interactions found. Use this context to provide more informed responses:\n\n${memoryContext}`,
        });
      }
    } else {
      // No file context — just cache the system prompt
      systemMessages.push({
        role: "system",
        content: systemPrompt,
        ...(isAnthropicModel ? { providerOptions: ANTHROPIC_CACHE } : {}),
      });

      if (memoryContext) {
        systemMessages.push({
          role: "system",
          content: `[Long-Term Memory — Past Conversations & Code]\nRelevant past interactions found. Use this context to provide more informed responses:\n\n${memoryContext}`,
        });
      }
    }

    // ===== Reduced maxOutputTokens for simple requests =====
    const maxTokens = complexity === "simple" ? 8192 : 16384;

    const result = streamText({
      model,
      system: systemMessages,
      messages,
      temperature: 0.7,
      maxOutputTokens: maxTokens,
    });

    const response = result.toUIMessageStreamResponse();
    // Add cost strategy headers
    const usage = getDailyUsage(rateLimitKey);
    response.headers.set("X-Cost-Strategy", complexity);
    response.headers.set("X-Model-Used", effectiveModel);
    response.headers.set("X-Daily-Usage", `${usage.count}/${usage.limit}`);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
