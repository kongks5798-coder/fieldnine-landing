import { streamText, convertToModelMessages } from "ai";
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

    const { messages: rawMessages } = await req.json();

    // Convert UIMessage format (from useChat) to ModelMessage format (for streamText)
    const messages = await convertToModelMessages(rawMessages);

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
