import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

const GITHUB_TOKEN = (process.env.GITHUB_TOKEN ?? "").trim();
const GITHUB_REPO = (process.env.GITHUB_REPO ?? "kongks5798-coder/field-nine-os").trim();
const API = "https://api.github.com";

const ALLOWED_EXTENSIONS = /\.(html|htm|css|js|ts|json|md|txt|svg|xml)$/i;

async function ghFetch(url: string) {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

/** GET /api/git-restore?sha=abc1234 — fetch file contents at a specific commit */
export async function GET(req: NextRequest) {
  // Rate limiting (10 restores per minute)
  const cookies = req.headers.get("cookie") ?? "";
  const sessionMatch = cookies.match(/f9_access=([^;]+)/);
  const rlKey = sessionMatch?.[1] ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`git-restore-${rlKey}`, { limit: 10, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry after ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "GITHUB_TOKEN not set" }, { status: 500 });
  }

  const sha = req.nextUrl.searchParams.get("sha");
  if (!sha || !/^[a-f0-9]{7,40}$/i.test(sha)) {
    return NextResponse.json({ error: "Invalid SHA" }, { status: 400 });
  }

  try {
    // Get the tree for this commit (recursive to support folders)
    const commitRes = await ghFetch(`${API}/repos/${GITHUB_REPO}/git/commits/${sha}`);
    if (!commitRes.ok) throw new Error(`Failed to get commit: ${commitRes.status}`);
    const commitData = await commitRes.json();

    const treeRes = await ghFetch(`${API}/repos/${GITHUB_REPO}/git/trees/${commitData.tree.sha}?recursive=1`);
    if (!treeRes.ok) throw new Error(`Failed to get tree: ${treeRes.status}`);
    const treeData = await treeRes.json();

    // Fetch files with allowed extensions from the tree
    const files: Record<string, string> = {};
    for (const entry of treeData.tree) {
      if (entry.type !== "blob") continue;
      if (!ALLOWED_EXTENSIONS.test(entry.path)) continue;
      // Skip hidden files/directories
      if (entry.path.startsWith(".") || entry.path.includes("/.")) continue;

      const blobRes = await ghFetch(`${API}/repos/${GITHUB_REPO}/git/blobs/${entry.sha}`);
      if (!blobRes.ok) {
        console.warn(`[git-restore] Failed to fetch blob ${entry.path}: ${blobRes.status}`);
        continue;
      }
      const blobData = await blobRes.json();
      files[entry.path] = blobData.encoding === "base64"
        ? Buffer.from(blobData.content, "base64").toString("utf-8")
        : blobData.content;
    }

    return NextResponse.json({ files, sha: commitData.sha.slice(0, 7) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
