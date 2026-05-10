import type { Track } from "./types";
import { cookies } from "next/headers";

interface TokenPayload {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export async function getUserToken(): Promise<string> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("spotify_tokens")?.value;
  if (!raw) throw new Error("NOT_LOGGED_IN");

  let tokens: TokenPayload;
  try {
    tokens = JSON.parse(raw);
  } catch {
    throw new Error("NOT_LOGGED_IN");
  }

  // If token is still valid (with 60s buffer), return it
  if (Date.now() < tokens.expires_at - 60_000) {
    return tokens.access_token;
  }

  // Token expired — refresh it
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!res.ok) throw new Error("TOKEN_REFRESH_FAILED");

  const data = await res.json();
  const newTokens: TokenPayload = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  cookieStore.set("spotify_tokens", JSON.stringify(newTokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return newTokens.access_token;
}

export function extractPlaylistId(input: string): string | null {
  const trimmed = input.trim();

  // Spotify URI: spotify:playlist:XXXX
  const uriMatch = trimmed.match(/spotify:playlist:([a-zA-Z0-9]{22})/);
  if (uriMatch) return uriMatch[1];

  // Web URL: open.spotify.com/playlist/XXXX or with query params
  try {
    const url = new URL(trimmed);
    const pathMatch = url.pathname.match(/\/playlist\/([a-zA-Z0-9]{22})/);
    if (pathMatch) return pathMatch[1];
  } catch {
    // Not a URL — try raw ID
  }

  // Raw 22-char alphanumeric ID
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return trimmed;

  return null;
}

interface SpotifyTrackItem {
  item: {
    id: string;
    name: string;
    artists: { name: string }[];
    album: {
      images: { url: string; height: number }[];
    };
    preview_url: string | null;
    type: string;
  } | null;
}

export async function getPlaylistTracks(
  playlistId: string,
  token: string
): Promise<{ name: string; items: SpotifyTrackItem[] }> {
  // First, get the playlist name
  const metaRes = await fetch(
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}?fields=name`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (metaRes.status === 404) throw new Error("PLAYLIST_NOT_FOUND");
  if (metaRes.status === 403) throw new Error("PLAYLIST_FORBIDDEN");
  if (metaRes.status === 429) throw new Error("RATE_LIMITED");
  if (!metaRes.ok) throw new Error(`Spotify API error: ${metaRes.status}`);

  const metaData = await metaRes.json();
  const playlistName = metaData.name || "Untitled Playlist";

  // Then fetch items using the /items endpoint (max 50 per page)
  const items: SpotifyTrackItem[] = [];
  let nextUrl: string | null =
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items?limit=50&fields=items(item(id,name,artists(name),album(images),preview_url,type)),next`;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 403) throw new Error("PLAYLIST_FORBIDDEN");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);

    const data = await res.json();
    if (data.items) {
      items.push(...data.items);
    }
    nextUrl = data.next;
  }

  return { name: playlistName, items };
}

export function buildTracksFromItems(items: SpotifyTrackItem[]): Track[] {
  const tracks: Track[] = [];
  for (const entry of items) {
    const t = entry.item;
    if (!t || !t.id || t.type !== "track") continue;
    tracks.push({
      id: t.id,
      name: t.name,
      artist: t.artists.map((a) => a.name).join(", "),
      albumArt:
        t.album.images.find((img) => img.height <= 300)?.url ??
        t.album.images[0]?.url ??
        null,
      previewUrl: t.preview_url,
      bpm: 0,
      camelot: "?",
    });
  }
  return tracks;
}
