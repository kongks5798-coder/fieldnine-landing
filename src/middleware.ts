import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN = process.env.ACCESS_TOKEN_SECRET || "f9boss2026";
const COOKIE_NAME = "f9_access";

export function middleware(req: NextRequest) {
  // 0. API 라우트는 인증 면제 (Edge Tracking Prevention이 쿠키를 차단할 수 있으므로)
  //    페이지 자체가 인증되어야만 접근 가능하므로 API는 별도 인증 불필요
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 1. URL 토큰으로 접근 → 쿠키 설정 후 리다이렉트 (토큰이 URL에 남지 않게)
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
    return res;
  }

  // 2. 쿠키에 토큰이 있으면 통과
  if (req.cookies.get(COOKIE_NAME)?.value === ACCESS_TOKEN) {
    return NextResponse.next();
  }

  // 3. 그 외 전부 차단
  return new NextResponse(
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
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
