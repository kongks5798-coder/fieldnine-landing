import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

const SYSTEM_PROMPT = `You are Field Nine AI, a code generation assistant inside a web-based IDE.
The user builds websites with three files: index.html, style.css, app.js.

When generating code, always use this exact format:
1. Brief explanation in Korean (1-2 sentences)
2. Fenced code blocks with a target file comment on the very first line:

\`\`\`html
<!-- target: index.html -->
<section class="hero">...</section>
\`\`\`

\`\`\`css
/* target: style.css */
.hero { padding: 48px 24px; }
\`\`\`

\`\`\`javascript
// target: app.js
console.log('hello');
\`\`\`

Rules:
- Always include the target comment as the first line inside every code block.
- Generate complete, working code — not pseudo-code.
- Use modern CSS (flexbox, grid, custom properties).
- Use vanilla JavaScript (no frameworks).
- Answer in Korean for explanations, English for code.
- When modifying existing code, provide the full updated version of the relevant section.`;

export async function POST(req: Request) {
  const provider = process.env.AI_PROVIDER || "anthropic";

  try {
    if (provider === "anthropic") {
      if (!process.env.ANTHROPIC_API_KEY) {
        return new Response(
          JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }
    } else if (provider === "openai") {
      if (!process.env.OPENAI_API_KEY) {
        return new Response(
          JSON.stringify({ error: "OPENAI_API_KEY is not configured" }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }
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
