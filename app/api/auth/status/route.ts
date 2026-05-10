import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("spotify_tokens")?.value;
  if (!raw) {
    return NextResponse.json({ loggedIn: false });
  }
  try {
    const tokens = JSON.parse(raw);
    return NextResponse.json({
      loggedIn: true,
      expiresAt: tokens.expires_at,
    });
  } catch {
    return NextResponse.json({ loggedIn: false });
  }
}
