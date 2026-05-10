"use client";

import { useState, useMemo } from "react";
import type { Track } from "@/lib/types";
import { isTransitionable } from "@/lib/camelot";
import TrackCard from "./TrackCard";

interface TrackListProps {
  tracks: Track[];
}

export default function TrackList({ tracks }: TrackListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wideKeyRange, setWideKeyRange] = useState(false);
  const [hideUnknown, setHideUnknown] = useState(false);

  const keyRange = wideKeyRange ? 2 : 1;

  const visibleTracks = useMemo(() => {
    if (!hideUnknown) return tracks;
    return tracks.filter((t) => t.bpm > 0 && t.camelot !== "?");
  }, [tracks, hideUnknown]);

  const compatibleIds = useMemo(() => {
    if (!selectedId) return null;
    const selected = visibleTracks.find((t) => t.id === selectedId);
    if (!selected) return null;
    const ids = new Set<string>();
    for (const t of visibleTracks) {
      if (t.id === selectedId) continue;
      if (isTransitionable(selected, t, keyRange)) {
        ids.add(t.id);
      }
    }
    return ids;
  }, [selectedId, visibleTracks, keyRange]);

  function handleSelect(trackId: string) {
    if (trackId === selectedId) {
      setSelectedId(null);
    } else {
      setSelectedId(trackId);
    }
  }

  function getState(trackId: string): "selected" | "compatible" | "disabled" | "idle" {
    if (trackId === selectedId) return "selected";
    if (!compatibleIds) return "idle";
    if (compatibleIds.has(trackId)) return "compatible";
    return "disabled";
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={wideKeyRange}
            onChange={(e) => setWideKeyRange(e.target.checked)}
            className="rounded bg-zinc-800 border-zinc-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
          />
          <span className="text-zinc-400">Wide key range (±2)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideUnknown}
            onChange={(e) => { setHideUnknown(e.target.checked); setSelectedId(null); }}
            className="rounded bg-zinc-800 border-zinc-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
          />
          <span className="text-zinc-400">Hide unknown BPM/key</span>
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {visibleTracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            state={getState(track.id)}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
