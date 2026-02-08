import { NextResponse } from "next/server";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID ?? "";

export const dynamic = "force-dynamic";

export async function GET() {
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
      return NextResponse.json({
        status: "error",
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
