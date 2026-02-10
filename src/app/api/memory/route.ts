import {
  storeMemory,
  searchMemories,
  getMemoryCount,
  isMemoryEnabled,
  SETUP_SQL,
} from "@/lib/supabaseMemory";

/**
 * POST /api/memory — Store a new memory
 * Body: { type: "code"|"conversation"|"error", content: string, metadata?: object, projectId?: string }
 */
export async function POST(req: Request) {
  if (!isMemoryEnabled()) {
    return Response.json(
      { error: "Memory system not configured. Set SUPABASE + OPENAI env vars." },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { type, content, metadata, projectId } = body;

    if (!type || !content) {
      return Response.json({ error: "type and content required" }, { status: 400 });
    }
    if (!["code", "conversation", "error"].includes(type)) {
      return Response.json({ error: "type must be code|conversation|error" }, { status: 400 });
    }

    const pid = projectId || "default";
    const ok = await storeMemory(pid, type, content, metadata ?? {});

    return Response.json({ success: ok });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/memory?q=query&projectId=xxx&topK=5
 * Returns matching memories ranked by similarity.
 * GET /api/memory?setup=1 — returns setup SQL
 * GET /api/memory?stats=1&projectId=xxx — returns memory count
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  // Setup SQL endpoint
  if (url.searchParams.has("setup")) {
    return Response.json({
      enabled: isMemoryEnabled(),
      sql: SETUP_SQL,
      instructions: "Run this SQL in Supabase Dashboard → SQL Editor → New Query",
    });
  }

  // Stats endpoint
  if (url.searchParams.has("stats")) {
    const pid = url.searchParams.get("projectId") || "default";
    const count = await getMemoryCount(pid);
    return Response.json({ projectId: pid, count, enabled: isMemoryEnabled() });
  }

  // Search endpoint
  if (!isMemoryEnabled()) {
    return Response.json(
      { error: "Memory system not configured" },
      { status: 503 },
    );
  }

  const query = url.searchParams.get("q");
  if (!query) {
    return Response.json({ error: "q parameter required" }, { status: 400 });
  }

  const pid = url.searchParams.get("projectId") || "default";
  const topK = parseInt(url.searchParams.get("topK") || "5", 10);

  try {
    const results = await searchMemories(pid, query, topK);
    return Response.json({
      results: results.map((r) => ({
        ...r.memory,
        similarity: r.similarity,
      })),
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 500 },
    );
  }
}
