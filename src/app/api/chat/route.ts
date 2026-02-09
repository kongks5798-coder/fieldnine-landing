import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

const SYSTEM_PROMPT = `You are Field Nine AI — a senior full-stack developer inside a web-based IDE.
The user builds websites with exactly three files: index.html, style.css, app.js.

## Response Format
1. Brief explanation in Korean (1-2 sentences)
2. Always output ALL THREE code blocks — index.html, style.css, app.js — with the COMPLETE file contents.

\`\`\`html
<!-- target: index.html -->
<!DOCTYPE html>
<html lang="ko">
<head>...</head>
<body>...</body>
</html>
\`\`\`

\`\`\`css
/* target: style.css */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { ... }
\`\`\`

\`\`\`javascript
// target: app.js
document.addEventListener('DOMContentLoaded', () => { ... });
\`\`\`

## Critical Rules
- ALWAYS include the target comment (<!-- target: index.html -->, /* target: style.css */, // target: app.js) as the FIRST line of every code block.
- ALWAYS output COMPLETE file contents — never partial snippets. Each code block replaces the entire file.
- The HTML must be a complete document with <!DOCTYPE html>, <html>, <head>, <body>.
- The HTML must include <link rel="stylesheet" href="style.css"> and <script src="app.js"></script>.
- Every DOM element referenced in app.js MUST exist in index.html. Never call getElementById/querySelector on elements that don't exist.

## Design Standards
- Modern, polished, production-quality UI — never output basic/ugly placeholder pages.
- Use a cohesive color palette with proper contrast (dark backgrounds: #0a0a0a-#1a1a2e, light text: #e2e8f0).
- Use CSS flexbox/grid for layouts. Add smooth transitions, hover effects, subtle animations.
- Typography: system font stack, clear hierarchy (h1 2.5-3rem bold, body 1rem, small 0.875rem).
- Spacing: consistent padding/margin (multiples of 8px). Border-radius: 8-16px for cards.
- Add gradient accents, box-shadows, and visual depth.
- Make it responsive with max-width containers and fluid sizing.

## JavaScript Standards
- Wrap all code in DOMContentLoaded listener.
- Use addEventListener instead of inline onclick attributes.
- Add meaningful interactivity: click handlers, animations, dynamic content, counters, etc.
- Log startup message: console.log('🚀 App loaded!');

## Language
- Explanations: Korean
- Code: English (variable names, comments, HTML content can mix Korean for UI text)`;

export async function POST(req: Request) {
  // Auto-detect provider: explicit setting > available key > error
  const explicit = process.env.AI_PROVIDER;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const provider = explicit || (hasOpenAI ? "openai" : hasAnthropic ? "anthropic" : "none");

  try {
    if (provider === "none" || (provider === "anthropic" && !hasAnthropic) || (provider === "openai" && !hasOpenAI)) {
      return new Response(
        JSON.stringify({ error: `No API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.`, provider, hasOpenAI, hasAnthropic }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    const { messages } = await req.json();

    const model =
      provider === "openai"
        ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })("gpt-4o")
        : createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })(
            "claude-sonnet-4-20250514",
          );

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages,
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
