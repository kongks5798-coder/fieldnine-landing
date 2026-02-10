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
    // Google auth endpoint는 인증 없이 접근 가능
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

  // 4. 로그인 페이지 표시 (Google Sign-In + ?access= 폴백)
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
      background: #F9F9F7; color: #171717;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .container { text-align: center; padding: 2rem; max-width: 360px; }
    h1 { font-size: 2rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    p { color: #86868b; font-size: 0.9rem; margin-bottom: 1.5rem; }
    #g_id_onload { display: flex; justify-content: center; margin-bottom: 1.5rem; }
    .divider { display: flex; align-items: center; gap: 12px; margin: 1.5rem 0; color: #86868b; font-size: 0.75rem; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #d1d1d6; }
    .form { display: flex; flex-direction: column; gap: 0.75rem; }
    input {
      padding: 0.75rem 1rem; border: 1px solid #d1d1d6; border-radius: 12px;
      font-size: 0.95rem; outline: none; text-align: center;
      transition: border-color 0.2s;
    }
    input:focus { border-color: #0079f2; }
    button {
      padding: 0.75rem; background: #0079f2; color: white; border: none;
      border-radius: 12px; font-size: 0.95rem; font-weight: 600;
      cursor: pointer; transition: background 0.2s;
    }
    button:hover { background: #0066cc; }
    .err { color: #f43f5e; font-size: 0.8rem; margin-top: 0.5rem; display: none; }
    .status { font-size: 0.8rem; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>F9 OS</h1>
    <p>Access Restricted</p>

    <div id="google-btn-wrap">
      <div id="g_id_onload"
        data-client_id="${googleClientId}"
        data-callback="handleGoogleLogin"
        data-auto_prompt="false">
      </div>
      <div class="g_id_signin"
        data-type="standard"
        data-size="large"
        data-theme="outline"
        data-text="sign_in_with"
        data-shape="pill"
        data-logo_alignment="left">
      </div>
    </div>
    <div id="status" class="status"></div>

    <div class="divider">or access code</div>

    <div class="form">
      <input id="pw" type="password" placeholder="Access Code" autocomplete="off" />
      <button id="btn" type="button">Enter</button>
      <div id="err" class="err">Invalid code</div>
    </div>
  </div>
  <script>
    function handleGoogleLogin(response) {
      var status = document.getElementById('status');
      status.textContent = 'Verifying...';
      status.style.color = '#0079f2';
      fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) {
          status.textContent = 'Welcome!';
          status.style.color = '#00b894';
          window.location.reload();
        } else {
          status.textContent = data.error || 'Login failed';
          status.style.color = '#f43f5e';
        }
      })
      .catch(function() {
        status.textContent = 'Network error';
        status.style.color = '#f43f5e';
      });
    }
    function submit(){var v=document.getElementById('pw').value;if(!v)return;window.location.href=window.location.pathname+'?access='+encodeURIComponent(v);}
    document.getElementById('btn').onclick=submit;
    document.getElementById('pw').onkeydown=function(e){if(e.key==='Enter')submit();};
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
