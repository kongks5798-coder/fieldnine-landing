import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const ACCESS_TOKEN = (process.env.ACCESS_TOKEN_SECRET ?? "").trim();
const COOKIE_NAME = "f9_jwt";
const JWT_SECRET = new TextEncoder().encode(ACCESS_TOKEN || "fallback-insecure-key");
const JWT_EXPIRY = "8h";

/** Content Security Policy */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net fonts.googleapis.com",
  "font-src 'self' fonts.gstatic.com cdn.jsdelivr.net",
  "img-src 'self' data: blob: *.supabase.co",
  "connect-src 'self' *.supabase.co api.github.com api.vercel.com",
  "frame-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "media-src 'self' blob: data: *.supabase.co",
].join("; ");

/** Shared security headers applied to all responses */
const SECURITY_HEADERS: Record<string, string> = {
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": CSP_DIRECTIVES,
};

function addSecurityHeaders(res: NextResponse) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

/** Issue a signed JWT */
async function issueJWT(): Promise<string> {
  return new SignJWT({ sub: "f9-user", iat: Math.floor(Date.now() / 1000) })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

/** Verify JWT from cookie */
async function verifyJWT(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

/** Check if request carries a valid JWT cookie */
async function isAuthenticated(req: NextRequest): Promise<boolean> {
  if (!ACCESS_TOKEN) return false;
  const jwt = req.cookies.get(COOKIE_NAME)?.value;
  if (!jwt) return false;
  return verifyJWT(jwt);
}

export async function proxy(req: NextRequest) {
  // 0. Fail-closed: if token not configured, block everything
  if (!ACCESS_TOKEN) {
    return addSecurityHeaders(
      new NextResponse("Server misconfigured: ACCESS_TOKEN_SECRET not set", { status: 503 }),
    );
  }

  // 1. API 라우트 — JWT 인증 + CSRF 헤더 검증
  if (req.nextUrl.pathname.startsWith("/api/")) {
    if (!(await isAuthenticated(req))) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );
    }
    // CSRF protection: mutating requests must include X-Requested-With header
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
      const csrf = req.headers.get("x-requested-with");
      if (csrf !== "F9OS") {
        return addSecurityHeaders(
          NextResponse.json({ error: "CSRF validation failed" }, { status: 403 }),
        );
      }
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // 2. URL 토큰으로 접근 → JWT 쿠키 설정 후 리다이렉트
  const tokenParam = req.nextUrl.searchParams.get("access");
  if (tokenParam === ACCESS_TOKEN) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("access");
    const res = NextResponse.redirect(url);
    const jwt = await issueJWT();
    res.cookies.set(COOKIE_NAME, jwt, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
    });
    return addSecurityHeaders(res);
  }

  // 3. 쿠키에 JWT가 유효하면 통과
  if (await isAuthenticated(req)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // 4. 로그인 페이지 표시
  return addSecurityHeaders(
    new NextResponse(
      `<!DOCTYPE html>
<html lang="ko">
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
    .container { text-align: center; padding: 2rem; max-width: 360px; }
    h1 { font-size: 2rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    p { color: #86868b; font-size: 0.9rem; margin-bottom: 1.5rem; }
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
  </style>
</head>
<body>
  <div class="container">
    <h1>F9 OS</h1>
    <p>Access Restricted</p>
    <div class="form">
      <input id="pw" type="password" placeholder="Access Code" autocomplete="off" autofocus />
      <button id="btn" type="button">Enter</button>
      <div id="err" class="err">Invalid code</div>
    </div>
  </div>
  <script>
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
