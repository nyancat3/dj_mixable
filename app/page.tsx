"use client";

import { useState, useEffect, useRef } from "react";
import type { Track } from "@/lib/types";
import TrackList from "@/components/TrackList";

export default function Home() {
  const [url, setUrl] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null); // null = checking
  const [rbUploaded, setRbUploaded] = useState(false);
  const [rbTrackCount, setRbTrackCount] = useState(0);
  const [rbUploading, setRbUploading] = useState(false);
  const [matchStats, setMatchStats] = useState<{ matched: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => setLoggedIn(data.loggedIn))
      .catch(() => setLoggedIn(false));

    fetch("/api/rekordbox/status")
      .then((r) => r.json())
      .then((data) => {
        setRbUploaded(data.uploaded);
        setRbTrackCount(data.trackCount);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setLoggedIn(false);
    setTracks([]);
    setPlaylistName("");
    setMatchStats(null);
  }

  async function handleRbUpload(file: File) {
    setRbUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/rekordbox", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to upload Rekordbox library");
        return;
      }
      setRbUploaded(true);
      setRbTrackCount(data.trackCount);
    } catch {
      setError("Failed to upload file. Please try again.");
    } finally {
      setRbUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleRbUpload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleRbUpload(file);
  }

  async function handleLoad() {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setTracks([]);
    setPlaylistName("");
    setMatchStats(null);

    try {
      const res = await fetch("/api/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load playlist");
        return;
      }

      if (!data.tracks || data.tracks.length === 0) {
        setError("This playlist has no tracks.");
        return;
      }

      setPlaylistName(data.name || "");
      setTracks(data.tracks);
      if (data.matched !== undefined) {
        setMatchStats({ matched: data.matched, total: data.total });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Still checking auth status
  if (loggedIn === null) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        Loading…
      </div>
    );
  }

  // Not logged in — show login prompt
  if (!loggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">Welcome to DJ Mixable</h2>
          <p className="text-zinc-400 max-w-md">
            Log in with your Spotify account to load your playlists and find smooth transitions by BPM and key.
          </p>
        </div>
        <a
          href="/api/auth/login"
          className="rounded-lg bg-[#1DB954] px-8 py-3 text-sm font-semibold text-white hover:bg-[#1ed760] transition-colors"
        >
          Log in with Spotify
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rekordbox upload */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-500/10"
            : rbUploaded
              ? "border-green-500/30 bg-green-500/5"
              : "border-zinc-700 bg-zinc-900/50"
        }`}
      >
        {rbUploaded ? (
          <div className="flex items-center justify-center gap-3">
            <span className="text-green-400 text-sm">
              ✓ Rekordbox library loaded — {rbTrackCount.toLocaleString()} tracks
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-zinc-400 hover:text-white underline"
            >
              Replace
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">
              {rbUploading
                ? "Uploading…"
                : "Drop your Rekordbox XML file here, or"}
            </p>
            {!rbUploading && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700 transition-colors"
              >
                Choose File
              </button>
            )}
            <p className="text-xs text-zinc-500">
              Export from Rekordbox: XML (File → Export Collection in xml) or TXT (select tracks → right-click → copy)
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Input + logout */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          placeholder="Paste a Spotify playlist URL..."
          className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleLoad}
          disabled={loading || !url.trim()}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {loading ? "Loading…" : "Load"}
        </button>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors shrink-0"
        >
          Logout
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg bg-white/5 p-3 animate-pulse"
            >
              <div className="w-12 h-12 rounded bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/10 rounded w-3/4" />
                <div className="h-2 bg-white/10 rounded w-1/2" />
              </div>
              <div className="w-10 h-6 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Playlist header + tracks */}
      {!loading && tracks.length > 0 && (
        <>
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">{playlistName}</h2>
            <span className="text-sm text-zinc-400">
              {tracks.length} tracks
              {matchStats && (
                <> · {matchStats.matched}/{matchStats.total} matched</>
              )}
            </span>
          </div>
          {matchStats && matchStats.matched < matchStats.total && (
            <p className="text-xs text-zinc-500">
              {matchStats.total - matchStats.matched} tracks not found in your Rekordbox library — they'll show "?" for BPM/key.
            </p>
          )}
          <p className="text-sm text-zinc-500">
            Tap a track to see compatible transitions. Tap again to deselect.
          </p>
          <TrackList tracks={tracks} />
        </>
      )}
    </div>
  );
}
