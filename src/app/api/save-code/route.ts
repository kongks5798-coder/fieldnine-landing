import { NextRequest, NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
const GITHUB_REPO = process.env.GITHUB_REPO ?? "kongks5798-coder/fieldnine-landing";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH ?? "master";
const API = "https://api.github.com";

interface FileChange {
  path: string;
  content: string;
}

interface SaveCodeBody {
  files: FileChange[];
  message: string;
}

async function ghFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers as Record<string, string>),
    },
  });
}

/**
 * Atomic multi-file commit via GitHub Git Data API:
 * 1. Get latest commit SHA on branch
 * 2. Get the tree SHA of that commit
 * 3. Create a new tree with file changes
 * 4. Create a new commit pointing to new tree
 * 5. Update branch ref to new commit
 */
async function createCommit(files: FileChange[], message: string) {
  // 1. Get latest commit on branch
  const refRes = await ghFetch(
    `${API}/repos/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`
  );
  if (!refRes.ok) throw new Error(`Failed to get ref: ${refRes.status}`);
  const refData = await refRes.json();
  const latestCommitSha = refData.object.sha;

  // 2. Get the tree of that commit
  const commitRes = await ghFetch(
    `${API}/repos/${GITHUB_REPO}/git/commits/${latestCommitSha}`
  );
  if (!commitRes.ok) throw new Error(`Failed to get commit: ${commitRes.status}`);
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for each file, then build tree entries
  const treeEntries = await Promise.all(
    files.map(async (file) => {
      const blobRes = await ghFetch(`${API}/repos/${GITHUB_REPO}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({
          content: file.content,
          encoding: "utf-8",
        }),
      });
      if (!blobRes.ok) throw new Error(`Failed to create blob: ${blobRes.status}`);
      const blobData = await blobRes.json();
      return {
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blobData.sha,
      };
    })
  );

  // 4. Create new tree
  const treeRes = await ghFetch(`${API}/repos/${GITHUB_REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeEntries,
    }),
  });
  if (!treeRes.ok) throw new Error(`Failed to create tree: ${treeRes.status}`);
  const treeData = await treeRes.json();

  // 5. Create new commit
  const newCommitRes = await ghFetch(`${API}/repos/${GITHUB_REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [latestCommitSha],
    }),
  });
  if (!newCommitRes.ok) throw new Error(`Failed to create commit: ${newCommitRes.status}`);
  const newCommitData = await newCommitRes.json();

  // 6. Update branch ref
  const updateRefRes = await ghFetch(
    `${API}/repos/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`,
    {
      method: "PATCH",
      body: JSON.stringify({ sha: newCommitData.sha }),
    }
  );
  if (!updateRefRes.ok) throw new Error(`Failed to update ref: ${updateRefRes.status}`);

  return {
    commitSha: newCommitData.sha,
    commitUrl: newCommitData.html_url,
    filesChanged: files.map((f) => f.path),
  };
}

// Security: Only allow safe file paths
const ALLOWED_EXTENSIONS = /\.(html|htm|css|js|ts|json|md|txt|svg|xml)$/i;
const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const MAX_FILES = 10;
const MAX_FILE_SIZE = 500_000; // 500KB per file

function isPathSafe(path: string): boolean {
  if (!path || typeof path !== "string") return false;
  // Block NUL bytes and control characters
  if (/[\x00-\x1f]/.test(path)) return false;
  // Block path traversal patterns
  if (path.includes("..") || path.includes("/") || path.includes("\\")) return false;
  // Only flat filenames — no directories, no hidden files
  if (path.startsWith(".")) return false;
  // Whitelist: alphanumeric + dot/dash/underscore only
  if (!SAFE_FILENAME.test(path)) return false;
  // Must have an allowed extension
  if (!ALLOWED_EXTENSIONS.test(path)) return false;
  // Max filename length
  if (path.length > 100) return false;
  return true;
}

export async function POST(request: NextRequest) {
  // Validate token
  if (!GITHUB_TOKEN) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN not configured", hint: "Add GITHUB_TOKEN to .env.local" },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as SaveCodeBody;

    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    if (body.files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files (max ${MAX_FILES})` },
        { status: 400 }
      );
    }

    // Validate each file path and size
    for (const file of body.files) {
      if (!isPathSafe(file.path)) {
        return NextResponse.json(
          { error: `Invalid file path: ${file.path}` },
          { status: 400 }
        );
      }
      if (typeof file.content !== "string" || file.content.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large: ${file.path}` },
          { status: 400 }
        );
      }
    }

    const result = await createCommit(
      body.files,
      body.message || "feat: AI-generated code update"
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[save-code] Error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
