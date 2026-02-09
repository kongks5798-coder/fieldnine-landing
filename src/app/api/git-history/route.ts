import { NextRequest, NextResponse } from "next/server";
import { cached, invalidateCachePrefix } from "@/lib/apiCache";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
const GITHUB_REPO = process.env.GITHUB_REPO ?? "kongks5798-coder/field-nine-os";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH ?? "main";
const API = "https://api.github.com";

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
}

interface CommitEntry {
  sha: string;
  fullSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

/** GET /api/git-history?page=1&per_page=20&fresh=1 */
export async function GET(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return NextResponse.json({ commits: [], error: "GITHUB_TOKEN not set" }, { status: 200 });
  }

  const page = req.nextUrl.searchParams.get("page") || "1";
  const perPage = req.nextUrl.searchParams.get("per_page") || "20";
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";

  if (fresh) invalidateCachePrefix("git-history:");

  try {
    const cacheKey = `git-history:${page}:${perPage}`;
    const commits = await cached<CommitEntry[]>(cacheKey, 30_000, async () => {
      const res = await fetch(
        `${API}/repos/${GITHUB_REPO}/commits?sha=${GITHUB_BRANCH}&page=${page}&per_page=${perPage}`,
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
          },
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API ${res.status}: ${text}`);
      }

      const data: GitHubCommit[] = await res.json();
      return data.map((c) => ({
        sha: c.sha.slice(0, 7),
        fullSha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url,
      }));
    });

    return NextResponse.json({ commits });
  } catch (err) {
    return NextResponse.json({ commits: [], error: (err as Error).message });
  }
}
