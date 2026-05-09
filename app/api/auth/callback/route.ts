import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Use Host header to build URLs — Next.js normalizes request.url hostname,
  // which can cause localhost/127.0.0.1 mismatches and break cookies
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;

  const storedState = request.cookies.get("spotify_auth_state")?.value;

  if (error) {
    return NextResponse.redirect(new URL("/?error=auth_denied", origin));
  }

  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL("/?error=state_mismatch", origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", origin));
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/api/auth/callback";

  // Exchange code for tokens
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/?error=token_exchange_failed", origin));
  }

  const tokenData = await tokenRes.json();

  // Store tokens in HTTP-only cookie (JSON-encoded)
  const tokenPayload = JSON.stringify({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Date.now() + tokenData.expires_in * 1000,
  });

  const response = NextResponse.redirect(new URL("/", origin));

  // Clean up state cookie
  response.cookies.delete("spotify_auth_state");

  response.cookies.set("spotify_tokens", tokenPayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days (refresh token persists)
    path: "/",
  });

  return response;
}
