import { streamText, convertToModelMessages, type SystemModelMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { checkRateLimit } from "@/lib/rateLimit";

/** Anthropic cache control marker — cached for 5 min, saves up to 90% cost */
const ANTHROPIC_CACHE = { anthropic: { cacheControl: { type: "ephemeral" as const } } };

const SYSTEM_PROMPT = `You are Field Nine AI — a senior full-stack developer inside a web-based IDE.
The user builds websites with exactly three files: index.html, style.css, app.js.

## Response Format
1. Brief explanation in Korean (1-2 sentences)
2. Always output ALL THREE code blocks — index.html, style.css, app.js — with the COMPLETE file contents.

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
// target: app.js
document.addEventListener('DOMContentLoaded', () => {
  // all logic here, 30+ lines
});
\`\`\`

## Critical Rules
- ALWAYS include the target comment (<!-- target: index.html -->, /* target: style.css */, // target: app.js) as the FIRST line of every code block.
- ALWAYS output COMPLETE file contents — never partial snippets. Each code block replaces the entire file.
- The HTML must be a complete document with <!DOCTYPE html>, <html>, <head>, <body>.
- The HTML must include <link rel="stylesheet" href="style.css"> and <script src="app.js"></script>.
- Every DOM element referenced in app.js MUST exist in index.html. Never call getElementById/querySelector on elements that don't exist.
- NEVER reference undefined variables. Every variable must be declared with const/let before use.
- NEVER use inline onclick attributes. Always use addEventListener.

## Quality Minimums (MANDATORY)
- HTML: minimum 30 lines. Include navigation, hero/main section, and footer.
- CSS: minimum 60 lines. Must include: gradients, transitions, hover effects, box-shadow, border-radius.
- JS: minimum 20 lines. Must include: DOMContentLoaded, addEventListener, at least 2 interactive features.
- NEVER output a basic/ugly page with just a heading and a button. That is unacceptable.
- Think of yourself as a designer at a top agency. Every output should look like a premium product landing page.

## Design Standards
- Dark theme: background #0a0a0a to #1a1a2e, text #e2e8f0, accent gradients (blue→purple→pink).
- Use CSS flexbox/grid for layouts. Add smooth transitions (0.3s ease), hover effects, subtle animations.
- Typography: system font stack, clear hierarchy (h1 2.5-3rem bold, body 1rem, small 0.875rem).
- Spacing: consistent padding/margin (multiples of 8px). Border-radius: 8-16px for cards.
- Add gradient accents (linear-gradient), box-shadows (0 4px 24px rgba), and visual depth.
- Make it responsive with max-width containers and fluid sizing.
- Include visual elements: icons (emoji or SVG), badges, cards, counters, progress bars, etc.

## JavaScript Standards
- Wrap ALL code in DOMContentLoaded listener.
- Use addEventListener — never inline handlers.
- Add meaningful interactivity: click handlers, animations, dynamic content updates, counters, toggles, etc.
- Guard every DOM query: \`const el = document.getElementById('x'); if (el) { ... }\`
- Log startup message: console.log('🚀 App loaded!');

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
  const provider = explicit || (hasOpenAI ? "openai" : hasAnthropic ? "anthropic" : "none");

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
- Do NOT output unchanged files.
- Each code block must still include the target comment and contain the COMPLETE file content.
- Explain what changed and why in Korean (1-2 sentences per file).`;
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
    } else {
      // No file context — just cache the system prompt
      systemMessages.push({
        role: "system",
        content: systemPrompt,
        ...(isAnthropicModel ? { providerOptions: ANTHROPIC_CACHE } : {}),
      });
    }

    const result = streamText({
      model,
      system: systemMessages,
      messages,
      temperature: 0.7,
      maxOutputTokens: 4096,
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
