import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/api/auth/callback";

  if (!clientId) {
    return NextResponse.json({ error: "Missing SPOTIFY_CLIENT_ID" }, { status: 500 });
  }

  // Ensure the browser is on the same origin as the Spotify redirect URI
  // so cookies set here are visible to the callback
  const callbackOrigin = new URL(redirectUri).origin;
  const requestHost = request.headers.get("host") || "";
  const callbackHost = new URL(redirectUri).host;
  if (requestHost !== callbackHost) {
    return NextResponse.redirect(new URL("/api/auth/login", callbackOrigin));
  }

  // Generate random state for CSRF protection
  const state = crypto.randomBytes(16).toString("hex");

  const scopes = "playlist-read-private playlist-read-collaborative";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
  });

  const response = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);

  response.cookies.set("spotify_auth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
