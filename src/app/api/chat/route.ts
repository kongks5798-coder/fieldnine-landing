import { streamText, convertToModelMessages, type SystemModelMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { checkRateLimit } from "@/lib/rateLimit";
import { indexProject, searchCode, isIndexed } from "@/lib/semanticIndex";
import { searchMemories, isMemoryEnabled } from "@/lib/supabaseMemory";

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
- Code: English (variable names, comments, HTML content can mix Korean for UI text)`;

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

  // Auto-detect provider: explicit setting > available key > error
  const explicit = process.env.AI_PROVIDER;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
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
    const requestedModel = body?.model as string | undefined; // e.g. "gpt-4o", "gpt-4o-mini", "claude-sonnet"
    const mode = (body?.mode as string) ?? "build"; // "build" | "plan" | "edit"
    const fileContext = body?.fileContext as Record<string, string> | undefined;

    // Input validation
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
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
    // Limit total payload size (~200KB) to prevent abuse
    const totalSize = rawMessages.reduce(
      (sum: number, m: Record<string, unknown>) =>
        sum + (typeof m.content === "string" ? m.content.length : JSON.stringify(m).length),
      0,
    );
    if (totalSize > 200_000) {
      return new Response(
        JSON.stringify({ error: "Request too large (max ~200KB)" }),
        { status: 413, headers: { "Content-Type": "application/json" } },
      );
    }

    // useChat sends UIMessage format (with parts array),
    // but initial generation sends plain format (with content string).
    // Detect and convert accordingly.
    const isUIMessage = rawMessages.some((m: Record<string, unknown>) => Array.isArray(m.parts));
    const messages = isUIMessage
      ? await convertToModelMessages(rawMessages)
      : rawMessages;

    // Model selection: client can request a specific model, otherwise use default
    const MODELS: Record<string, () => ReturnType<ReturnType<typeof createOpenAI>> | ReturnType<ReturnType<typeof createAnthropic>>> = {
      ...(hasOpenAI ? {
        "gpt-4o": () => createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })("gpt-4o"),
        "gpt-4o-mini": () => createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })("gpt-4o-mini"),
      } : {}),
      ...(hasAnthropic ? {
        "claude-sonnet": () => createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })("claude-sonnet-4-20250514"),
      } : {}),
    };

    const modelFactory = requestedModel && MODELS[requestedModel]
      ? MODELS[requestedModel]
      : provider === "openai"
        ? () => createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })("gpt-4o")
        : () => createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })("claude-sonnet-4-20250514");
    const model = modelFactory();

    // Build mode-aware system prompt
    let systemPrompt = SYSTEM_PROMPT;
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

    // ===== Extract user query for search =====
    const lastMsg = rawMessages[rawMessages.length - 1];
    const userQuery = typeof lastMsg?.content === "string"
      ? lastMsg.content
      : Array.isArray(lastMsg?.parts)
        ? lastMsg.parts.filter((p: Record<string, unknown>) => p.type === "text").map((p: Record<string, unknown>) => p.text).join(" ")
        : "";

    // ===== Semantic Vector Indexing =====
    // Index files (incremental — fast if unchanged) and search for relevant chunks
    let semanticContext = "";
    const hasEmbeddingKey = !!process.env.OPENAI_API_KEY;

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
    const isAnthropicModel = requestedModel === "claude-sonnet"
      || (!requestedModel && provider === "anthropic");

    // Build system messages with Anthropic prompt caching
    // Breakpoint 1: System instructions (static per mode, cached ~5min)
    // Breakpoint 2: File context (changes per project state, cached ~5min)
    const systemMessages: SystemModelMessage[] = [];

    if (fileContext && Object.keys(fileContext).length > 0) {
      // Build file context string
      const contextText = Object.entries(fileContext)
        .map(([name, content]) => `--- ${name} ---\n${content}`)
        .join("\n\n");

      // Part 1: Instructions (cached)
      systemMessages.push({
        role: "system",
        content: systemPrompt,
        ...(isAnthropicModel ? { providerOptions: ANTHROPIC_CACHE } : {}),
      });

      // Part 2: File context (cached separately — changes less often than user messages)
      systemMessages.push({
        role: "system",
        content: `[Current Project Files]\n${contextText}`,
        ...(isAnthropicModel ? { providerOptions: ANTHROPIC_CACHE } : {}),
      });

      // Part 3: Semantic search results (most relevant code chunks for the user's query)
      if (semanticContext) {
        systemMessages.push({
          role: "system",
          content: `[Semantic Search — Most Relevant Code Chunks]\nThe following code sections are most relevant to the user's current request. Reference these when generating your response:\n\n${semanticContext}`,
        });
      }

      // Part 4: Long-term memory (past conversations/code from Supabase pgvector)
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

      // Still inject long-term memory if available
      if (memoryContext) {
        systemMessages.push({
          role: "system",
          content: `[Long-Term Memory — Past Conversations & Code]\nRelevant past interactions found. Use this context to provide more informed responses:\n\n${memoryContext}`,
        });
      }
    }

    const result = streamText({
      model,
      system: systemMessages,
      messages,
      temperature: 0.7,
      maxOutputTokens: 16384,
    });

    return result.toUIMessageStreamResponse();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
