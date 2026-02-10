import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

const VERCEL_TOKEN = process.env.F9_VERCEL_TOKEN ?? process.env.VERCEL_TOKEN ?? "";
const VERCEL_PROJECT_ID = process.env.F9_VERCEL_PROJECT_ID ?? process.env.VERCEL_PROJECT_ID ?? "";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID ?? "";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Rate limiting (30 polls per minute)
  const cookies = req.headers.get("cookie") ?? "";
  const sessionMatch = cookies.match(/f9_access=([^;]+)/);
  const rlKey = sessionMatch?.[1] ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`deploy-status-${rlKey}`, { limit: 30, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ status: "error", message: "Rate limit exceeded" }, { status: 429 });
  }

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return NextResponse.json({
      status: "unknown",
      message: "Vercel credentials not configured",
    });
  }

  try {
    const teamParam = VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : "";
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=1&target=production${teamParam}`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      // Token expired or API error — return idle (not error) to avoid stuck "Build Failed" badge
      return NextResponse.json({
        status: "idle",
        message: `Vercel API error: ${res.status}`,
      });
    }

    const data = await res.json();
    const deployment = data.deployments?.[0];

    if (!deployment) {
      return NextResponse.json({ status: "idle", message: "No deployments found" });
    }

    // Vercel deployment states: BUILDING, READY, ERROR, QUEUED, CANCELED
    const stateMap: Record<string, string> = {
      BUILDING: "building",
      QUEUED: "building",
      INITIALIZING: "building",
      READY: "ready",
      ERROR: "error",
      CANCELED: "error",
    };

    return NextResponse.json({
      status: stateMap[deployment.state] ?? "unknown",
      state: deployment.state,
      url: deployment.url ? `https://${deployment.url}` : null,
      createdAt: deployment.createdAt,
      readyAt: deployment.ready,
      meta: {
        githubCommitMessage: deployment.meta?.githubCommitMessage ?? null,
        githubCommitSha: deployment.meta?.githubCommitSha ?? null,
      },
    });
  } catch (error) {
    console.error("[deploy-status] Error:", error);
    return NextResponse.json({
      status: "error",
      message: (error as Error).message,
    });
  }
}
