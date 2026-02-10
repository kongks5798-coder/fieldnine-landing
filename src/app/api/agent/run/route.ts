import { runAgentPipeline } from "@/lib/agentOrchestrator";
import type { AgentEvent } from "@/lib/agentOrchestrator";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  // Auth check via cookie (same pattern as chat route)
  const cookies = req.headers.get("cookie") ?? "";
  const sessionMatch = cookies.match(/f9_access=([^;]+)/);
  const rateLimitKey = sessionMatch?.[1] ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const rl = checkRateLimit(rateLimitKey, { limit: 5, windowSec: 60 });
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Retry after ${rl.retryAfterSec}s.` }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const userRequest = body?.message as string;
    const fileContext = (body?.fileContext as Record<string, string>) ?? {};

    if (!userRequest || typeof userRequest !== "string") {
      return new Response(
        JSON.stringify({ error: "message field required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // SSE stream with safety timeout
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const safeClose = () => {
          if (closed) return;
          closed = true;
          try {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch { /* already closed */ }
        };

        // 100s safety timeout
        const timer = setTimeout(() => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Pipeline timeout (100s)" })}\n\n`));
          } catch { /* ignore */ }
          safeClose();
        }, 100000);

        const emit = (event: AgentEvent) => {
          if (closed) return;
          try {
            const data = JSON.stringify(event);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch {
            // Stream may be closed
          }
        };

        try {
          await runAgentPipeline(userRequest, fileContext, emit);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Pipeline error";
          emit({ type: "error", message: msg });
        }

        clearTimeout(timer);
        safeClose();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
