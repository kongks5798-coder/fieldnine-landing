import { NextRequest, NextResponse } from "next/server";

const ALLOWED_EMAIL = "kongks5798@gmail.com";
const COOKIE_NAME = "f9_access";

export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json();
    if (!credential || typeof credential !== "string") {
      return NextResponse.json({ error: "Missing credential" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      return NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 503 });
    }

    // Verify JWT via Google's tokeninfo endpoint (no library needed)
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    );

    if (!verifyRes.ok) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }

    const payload = await verifyRes.json();

    // Verify audience matches our client ID
    if (payload.aud !== clientId) {
      return NextResponse.json({ error: "Token audience mismatch" }, { status: 401 });
    }

    // Verify email
    if (payload.email !== ALLOWED_EMAIL || payload.email_verified !== "true") {
      return NextResponse.json({ error: "Unauthorized email" }, { status: 403 });
    }

    // Set auth cookie — use ACCESS_TOKEN_SECRET as cookie value for middleware compatibility
    const accessToken = process.env.ACCESS_TOKEN_SECRET?.trim();
    if (!accessToken) {
      return NextResponse.json({ error: "ACCESS_TOKEN_SECRET not configured" }, { status: 503 });
    }

    const res = NextResponse.json({ success: true, email: payload.email });
    res.cookies.set(COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (err) {
    console.error("[auth/google]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
