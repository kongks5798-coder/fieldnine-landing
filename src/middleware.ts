import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN = process.env.ACCESS_TOKEN_SECRET ?? "";
const COOKIE_NAME = "f9_access";

/** Shared security headers applied to all responses */
const SECURITY_HEADERS: Record<string, string> = {
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function addSecurityHeaders(res: NextResponse) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

/** Check if request carries a valid auth cookie */
export function isAuthenticated(req: NextRequest): boolean {
  if (!ACCESS_TOKEN) return false;
  return req.cookies.get(COOKIE_NAME)?.value === ACCESS_TOKEN;
}

export function middleware(req: NextRequest) {
  // 0. Fail-closed: if token not configured, block everything
  if (!ACCESS_TOKEN) {
    return addSecurityHeaders(
      new NextResponse("Server misconfigured: ACCESS_TOKEN_SECRET not set", { status: 503 }),
    );
  }

  // 1. API 라우트 — 쿠키 인증 필수
  if (req.nextUrl.pathname.startsWith("/api/")) {
    if (!isAuthenticated(req)) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // 2. URL 토큰으로 접근 → 쿠키 설정 후 리다이렉트 (토큰이 URL에 남지 않게)
  const tokenParam = req.nextUrl.searchParams.get("access");
  if (tokenParam === ACCESS_TOKEN) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("access");
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE_NAME, ACCESS_TOKEN, {
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24시간
    });
    return addSecurityHeaders(res);
  }

  // 3. 쿠키에 토큰이 있으면 통과
  if (isAuthenticated(req)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // 4. 그 외 전부 차단
  return addSecurityHeaders(
    new NextResponse(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Field Nine OS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F9F9F7; color: #171717;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 2rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
    p { color: #86868b; font-size: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>F9 OS</h1>
    <p>Access Restricted. Authorized personnel only.</p>
  </div>
</body>
</html>`,
      {
        status: 403,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    ),
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
