import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { checkRateLimit } from "@/lib/rateLimit";
import { autocompleteSchema, validateRequest } from "@/lib/apiValidation";

export async function POST(req: Request) {
  const cookies = req.headers.get("cookie") ?? "";
  const sessionMatch = cookies.match(/f9_access=([^;]+)/);
  const rateLimitKey = sessionMatch?.[1] ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`autocomplete-${rateLimitKey}`, { limit: 30, windowSec: 60 });
  if (!rl.allowed) {
    return new Response(JSON.stringify({ completion: "" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const openaiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  const anthropicKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  const hasOpenAI = !!openaiKey;
  const hasAnthropic = !!anthropicKey;

  if (!hasOpenAI && !hasAnthropic) {
    return new Response(JSON.stringify({ completion: "" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const validated = await validateRequest(req, autocompleteSchema);
    if (validated.error) return new Response(JSON.stringify({ completion: "" }), { status: 200, headers: { "Content-Type": "application/json" } });
    const { prefix, suffix, language, fileName } = validated.data;

    // Use the fastest/cheapest model for autocomplete
    const model = hasOpenAI
      ? createOpenAI({ apiKey: openaiKey })("gpt-4o-mini")
      : createAnthropic({ apiKey: anthropicKey })("claude-sonnet-4-20250514");

    const result = await generateText({
      model,
      system: `You are a code autocomplete engine. Given the code context, output ONLY the completion text (1-3 lines max). No explanations, no markdown, no code fences. Just the raw code that should follow the cursor position.
If unsure, output empty string. Language: ${language ?? "html"}. File: ${fileName ?? "unknown"}.`,
      prompt: `Complete the following code:\n\n${prefix.slice(-500)}█${(suffix ?? "").slice(0, 200)}`,
      temperature: 0.2,
      maxOutputTokens: 100,
    });

    const completion = result.text.trim();
    return new Response(JSON.stringify({ completion }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ completion: "" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
