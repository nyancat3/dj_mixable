"use client";

import type { Track } from "@/lib/types";

// 12 hue values for Camelot numbers 1–12, evenly spaced
const CAMELOT_HUES: Record<number, number> = {
  1: 0, 2: 30, 3: 60, 4: 90, 5: 120, 6: 150,
  7: 180, 8: 210, 9: 240, 10: 270, 11: 300, 12: 330,
};

function getCamelotColor(camelot: string): string {
  const match = camelot.match(/^(\d{1,2})[AB]$/);
  if (!match) return "hsl(0 0% 40%)";
  const num = parseInt(match[1], 10);
  const hue = CAMELOT_HUES[num] ?? 0;
  return `hsl(${hue} 70% 55%)`;
}

interface TrackCardProps {
  track: Track;
  state: "selected" | "compatible" | "disabled" | "idle";
  onSelect: (trackId: string) => void;
}

export default function TrackCard({ track, state, onSelect }: TrackCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(track.id)}
      className={`
        flex items-center gap-3 w-full rounded-lg p-3 text-left transition-all duration-150
        min-h-[60px] cursor-pointer
        ${state === "selected" ? "ring-2 ring-blue-500 bg-blue-500/10" : ""}
        ${state === "compatible" ? "bg-white/5 hover:bg-white/10" : ""}
        ${state === "idle" ? "bg-white/5 hover:bg-white/10" : ""}
        ${state === "disabled" ? "opacity-25 grayscale hover:opacity-40 hover:grayscale-[50%]" : ""}
      `}
    >
      {/* Album art */}
      {track.albumArt ? (
        <img
          src={track.albumArt}
          alt=""
          width={48}
          height={48}
          className="rounded shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded bg-white/10 shrink-0 flex items-center justify-center text-white/30">
          ♪
        </div>
      )}

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{track.name}</p>
        <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
      </div>

      {/* BPM */}
      <div className="text-xs text-zinc-400 shrink-0 text-right w-12">
        {track.bpm > 0 ? `${track.bpm}` : "?"}
        <span className="block text-[10px] text-zinc-500">BPM</span>
      </div>

      {/* Camelot badge */}
      <div
        className="shrink-0 rounded px-2 py-1 text-xs font-bold text-white min-w-[36px] text-center"
        style={{ backgroundColor: getCamelotColor(track.camelot) }}
      >
        {track.camelot}
      </div>
    </button>
  );
}
