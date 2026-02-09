import { NextResponse } from "next/server";

export function middleware() {
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
