import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/apiCache";
import { checkRateLimit } from "@/lib/rateLimit";

const GITHUB_TOKEN = (process.env.GITHUB_TOKEN ?? "").trim();
const GITHUB_REPO = (process.env.GITHUB_REPO ?? "kongks5798-coder/field-nine-os").trim();
const GITHUB_BRANCH = (process.env.GITHUB_BRANCH ?? "main").trim();

const VERCEL_TOKEN = (process.env.F9_VERCEL_TOKEN ?? process.env.VERCEL_TOKEN ?? "").trim();
const VERCEL_PROJECT_ID = (process.env.F9_VERCEL_PROJECT_ID ?? process.env.VERCEL_PROJECT_ID ?? "").trim();
const VERCEL_TEAM_ID = (process.env.VERCEL_TEAM_ID ?? "").trim();

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export const dynamic = "force-dynamic";

interface GitHubCommit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
  html_url: string;
}

async function fetchGitHub() {
  if (!GITHUB_TOKEN) return { connected: false, error: "GITHUB_TOKEN not set" };
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/commits?sha=${GITHUB_BRANCH}&per_page=5`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data: GitHubCommit[] = await res.json();
    return {
      connected: true,
      repo: GITHUB_REPO,
      branch: GITHUB_BRANCH,
      recentCommits: data.map((c) => ({
        sha: c.sha.slice(0, 7),
        message: c.commit.message.split("\n")[0],
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url,
      })),
    };
  } catch (err) {
    return { connected: false, error: (err as Error).message };
  }
}

async function fetchVercel() {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return { connected: false, error: "Vercel credentials not set" };
  try {
    const teamParam = VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : "";
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=1&target=production${teamParam}`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } },
    );
    if (!res.ok) throw new Error(`Vercel API ${res.status}`);
    const data = await res.json();
    const d = data.deployments?.[0];
    if (!d) return { connected: true, status: "idle", message: "No deployments" };
    const buildDuration = d.ready && d.createdAt ? d.ready - d.createdAt : null;
    return {
      connected: true,
      status: d.state as string,
      url: d.url ? `https://${d.url}` : null,
      createdAt: d.createdAt,
      buildDuration,
      commitMessage: (d.meta?.githubCommitMessage as string) ?? null,
      commitSha: (d.meta?.githubCommitSha as string)?.slice(0, 7) ?? null,
    };
  } catch (err) {
    return { connected: false, error: (err as Error).message };
  }
}

async function fetchSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { connected: false, error: "Supabase credentials not set" };
  try {
    const start = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const responseMs = Date.now() - start;
    if (!res.ok) throw new Error(`Supabase API ${res.status}`);
    const data = await res.json();
    const definitions = data?.definitions ?? data?.paths ?? data;
    const tablesCount = typeof definitions === "object" && definitions !== null ? Object.keys(definitions).length : 0;
    return { connected: true, responseMs, tablesCount };
  } catch (err) {
    return { connected: false, error: (err as Error).message };
  }
}

export async function GET(req: NextRequest) {
  const cookies = req.headers.get("cookie") ?? "";
  const sessionMatch = cookies.match(/f9_access=([^;]+)/);
  const rlKey = sessionMatch?.[1] ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`infra-status-${rlKey}`, { limit: 10, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const result = await cached("infra-status", 45_000, async () => {
      const [gh, vc, sb] = await Promise.allSettled([fetchGitHub(), fetchVercel(), fetchSupabase()]);
      return {
        github: gh.status === "fulfilled" ? gh.value : { connected: false, error: "fetch failed" },
        vercel: vc.status === "fulfilled" ? vc.value : { connected: false, error: "fetch failed" },
        supabase: sb.status === "fulfilled" ? sb.value : { connected: false, error: "fetch failed" },
        timestamp: new Date().toISOString(),
      };
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
