import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getUserToken,
  extractPlaylistId,
  getPlaylistTracks,
  buildTracksFromItems,
} from "@/lib/spotify";
import { matchTracks } from "@/lib/rekordbox";
import { getLibrary } from "@/lib/rekordbox-store";

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json(
      { error: "Missing 'url' field" },
      { status: 400 }
    );
  }

  const playlistId = extractPlaylistId(body.url);
  if (!playlistId) {
    return NextResponse.json(
      { error: "Invalid Spotify playlist URL or ID" },
      { status: 400 }
    );
  }

  try {
    const token = await getUserToken();
    const { name, items } = await getPlaylistTracks(playlistId, token);

    const tracks = buildTracksFromItems(items);

    // Match against Rekordbox library if available
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("rb_session")?.value;
    const rbLibrary = sessionId ? getLibrary(sessionId) : undefined;
    let matched = 0;

    if (rbLibrary) {
      const matches = matchTracks(tracks, rbLibrary);
      for (const track of tracks) {
        const m = matches.get(track.id);
        if (m) {
          track.bpm = m.bpm;
          track.camelot = m.camelot;
          matched++;
        }
      }
    }

    return NextResponse.json({ name, tracks, matched, total: tracks.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "NOT_LOGGED_IN") {
      return NextResponse.json(
        { error: "Please log in with Spotify first." },
        { status: 401 }
      );
    }
    if (message === "PLAYLIST_NOT_FOUND") {
      return NextResponse.json(
        { error: "Playlist not found." },
        { status: 404 }
      );
    }
    if (message === "PLAYLIST_FORBIDDEN") {
      return NextResponse.json(
        { error: "Cannot access this playlist. You must be the owner or a collaborator." },
        { status: 403 }
      );
    }
    if (message === "RATE_LIMITED") {
      return NextResponse.json(
        { error: "Rate limited by Spotify. Try again in a few seconds." },
        { status: 429 }
      );
    }
    console.error("Playlist API error:", message);
    return NextResponse.json(
      { error: "Failed to fetch playlist" },
      { status: 500 }
    );
  }
}
