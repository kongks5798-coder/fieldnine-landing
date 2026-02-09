import { NextRequest, NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
const GITHUB_REPO = process.env.GITHUB_REPO ?? "kongks5798-coder/fieldnine-landing";
const API = "https://api.github.com";

const ALLOWED_FILES = ["index.html", "style.css", "app.js"];

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
  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "GITHUB_TOKEN not set" }, { status: 500 });
  }

  const sha = req.nextUrl.searchParams.get("sha");
  if (!sha || !/^[a-f0-9]{7,40}$/i.test(sha)) {
    return NextResponse.json({ error: "Invalid SHA" }, { status: 400 });
  }

  try {
    // Get the tree for this commit
    const commitRes = await ghFetch(`${API}/repos/${GITHUB_REPO}/git/commits/${sha}`);
    if (!commitRes.ok) throw new Error(`Failed to get commit: ${commitRes.status}`);
    const commitData = await commitRes.json();

    const treeRes = await ghFetch(`${API}/repos/${GITHUB_REPO}/git/trees/${commitData.tree.sha}`);
    if (!treeRes.ok) throw new Error(`Failed to get tree: ${treeRes.status}`);
    const treeData = await treeRes.json();

    // Fetch only allowed files from the tree
    const files: Record<string, string> = {};
    for (const entry of treeData.tree) {
      if (!ALLOWED_FILES.includes(entry.path)) continue;
      const blobRes = await ghFetch(`${API}/repos/${GITHUB_REPO}/git/blobs/${entry.sha}`);
      if (!blobRes.ok) continue;
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
