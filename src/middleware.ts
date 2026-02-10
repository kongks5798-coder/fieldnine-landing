import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN = process.env.ACCESS_TOKEN_SECRET ?? "";
const COOKIE_NAME = "f9_access";

/** Content Security Policy */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' cdn.jsdelivr.net accounts.google.com",
  "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net fonts.googleapis.com accounts.google.com",
  "font-src 'self' fonts.gstatic.com cdn.jsdelivr.net",
  "img-src 'self' data: blob: *.supabase.co *.googleusercontent.com",
  "connect-src 'self' *.supabase.co api.github.com api.vercel.com accounts.google.com oauth2.googleapis.com",
  "frame-src 'self' blob: data: accounts.google.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob: data: *.supabase.co",
].join("; ");

/** Shared security headers applied to all responses */
const SECURITY_HEADERS: Record<string, string> = {
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": CSP_DIRECTIVES,
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

export async function middleware(req: NextRequest) {
  // 0. Fail-closed: if token not configured, block everything
  if (!ACCESS_TOKEN) {
    return addSecurityHeaders(
      new NextResponse("Server misconfigured: ACCESS_TOKEN_SECRET not set", { status: 503 }),
    );
  }

  // 1. API 라우트 — 쿠키 인증 필수 (Google auth 예외)
  if (req.nextUrl.pathname.startsWith("/api/")) {
    if (req.nextUrl.pathname === "/api/auth/google") {
      return addSecurityHeaders(NextResponse.next());
    }
    if (!isAuthenticated(req)) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // 2. 쿠키에 토큰이 있으면 통과
  if (isAuthenticated(req)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // 3. Google 전용 로그인 페이지 (kongks5798@gmail.com만 허용)
  const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
  return addSecurityHeaders(
    new NextResponse(
      `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Field Nine OS</title>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0a; color: #e2e8f0;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .container { text-align: center; padding: 2rem; max-width: 380px; }
    .logo { font-size: 3rem; margin-bottom: 1rem; }
    h1 {
      font-size: 1.8rem; font-weight: 800; letter-spacing: -0.03em;
      margin-bottom: 0.25rem;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .sub { color: #64748b; font-size: 0.85rem; margin-bottom: 2rem; }
    .g-wrap {
      display: flex; justify-content: center; margin-bottom: 1.5rem;
    }
    #status {
      font-size: 0.8rem; margin-top: 1rem;
      min-height: 1.2em;
    }
    .footer {
      margin-top: 3rem; color: #334155; font-size: 0.7rem;
      border-top: 1px solid rgba(255,255,255,0.06);
      padding-top: 1.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚡</div>
    <h1>Field Nine OS</h1>
    <p class="sub">Private Workspace — Owner Only</p>

    <div class="g-wrap">
      <div id="g_id_onload"
        data-client_id="${googleClientId}"
        data-callback="handleGoogleLogin"
        data-auto_prompt="false">
      </div>
      <div class="g_id_signin"
        data-type="standard"
        data-size="large"
        data-theme="filled_black"
        data-text="signin_with"
        data-shape="pill"
        data-logo_alignment="left">
      </div>
    </div>
    <div id="status"></div>

    <div class="footer">
      Authorized access only &middot; kongks5798@gmail.com
    </div>
  </div>
  <script>
    function handleGoogleLogin(response) {
      var s = document.getElementById('status');
      s.textContent = 'Verifying...';
      s.style.color = '#3b82f6';
      fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) {
          s.textContent = 'Welcome back!';
          s.style.color = '#00b894';
          window.location.reload();
        } else {
          s.textContent = data.error || 'Access denied';
          s.style.color = '#f43f5e';
        }
      })
      .catch(function() {
        s.textContent = 'Network error — retry';
        s.style.color = '#f43f5e';
      });
    }
  </script>
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
