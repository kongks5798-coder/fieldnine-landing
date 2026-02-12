import { NextRequest } from "next/server";
import { indexProject, searchCode, getIndexStats, isIndexed } from "@/lib/semanticIndex";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Rate limiting (20 requests per minute)
  const cookies = req.headers.get("cookie") ?? "";
  const sessionMatch = cookies.match(/f9_access=([^;]+)/);
  const rateLimitKey = sessionMatch?.[1] ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`semantic-${rateLimitKey}`, { limit: 20, windowSec: 60 });
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Retry after ${rl.retryAfterSec}s.` }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY not configured — semantic search unavailable" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const action = body?.action as string;
    const projectId = body?.projectId as string ?? "default";

    if (action === "index") {
      const files = body?.files as Record<string, string>;
      if (!files || Object.keys(files).length === 0) {
        return Response.json({ error: "No files provided" }, { status: 400 });
      }
      const result = await indexProject(projectId, files);
      return Response.json({ success: true, ...result });
    }

    if (action === "search") {
      const query = ((body?.query as string) ?? "").trim();
      const topK = (body?.topK as number) ?? 5;
      if (!query || query.length < 2) {
        return Response.json({ error: "Query too short (min 2 chars)" }, { status: 400 });
      }
      const results = await searchCode(projectId, query, topK, 0.25);
      return Response.json({
        results: results.map((r) => ({
          file: r.chunk.file,
          startLine: r.chunk.startLine,
          endLine: r.chunk.endLine,
          content: r.chunk.content,
          score: Math.round(r.score * 1000) / 1000,
        })),
      });
    }

    if (action === "stats") {
      const stats = getIndexStats(projectId);
      return Response.json({ indexed: isIndexed(projectId), stats });
    }

    return Response.json({ error: "Invalid action. Use: index, search, stats" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[semantic-search]", err instanceof Error ? err.message : err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
