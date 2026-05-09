import type { CamelotKey } from "./types";

// Spotify pitch class → Camelot number
// Index = pitch class (0=C, 1=C#, 2=D, ... 11=B)
const MAJOR_MAP: number[] = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
const MINOR_MAP: number[] = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];

// Rekordbox Tonality string → Camelot notation
// Maps standard key notation (e.g. "Am", "C", "F#m", "Dbm") to Camelot
const TONALITY_TO_CAMELOT: Record<string, string> = {
  // Minor keys (A = minor on Camelot wheel)
  "Abm": "1A", "G#m": "1A",
  "Ebm": "2A", "D#m": "2A",
  "Bbm": "3A", "A#m": "3A",
  "Fm":  "4A",
  "Cm":  "5A",
  "Gm":  "6A",
  "Dm":  "7A",
  "Am":  "8A",
  "Em":  "9A",
  "Bm":  "10A",
  "F#m": "11A", "Gbm": "11A",
  "Dbm": "12A", "C#m": "12A",
  // Major keys (B = major on Camelot wheel)
  "B":   "1B", "Cb":  "1B",
  "F#":  "2B", "Gb":  "2B",
  "Db":  "3B", "C#":  "3B",
  "Ab":  "4B", "G#":  "4B",
  "Eb":  "5B", "D#":  "5B",
  "Bb":  "6B", "A#":  "6B",
  "F":   "7B",
  "C":   "8B",
  "G":   "9B",
  "D":   "10B",
  "A":   "11B",
  "E":   "12B",
};

export function tonalityToCamelot(tonality: string): string {
  const trimmed = tonality.trim();
  // Already in Camelot notation (e.g. "9A", "12B")
  if (/^(1[0-2]|[1-9])[AB]$/.test(trimmed)) return trimmed;
  return TONALITY_TO_CAMELOT[trimmed] ?? "?";
}

export function toCamelot(key: number, mode: number): CamelotKey | null {
  if (key < 0 || key > 11) return null;
  const letter: "A" | "B" = mode === 1 ? "B" : "A";
  const number = mode === 1 ? MAJOR_MAP[key] : MINOR_MAP[key];
  return { number, letter };
}

export function camelotToString(ck: CamelotKey | null): string {
  if (!ck) return "?";
  return `${ck.number}${ck.letter}`;
}

export function isCompatibleKey(a: CamelotKey, b: CamelotKey, range: number = 1): boolean {
  // Same position
  if (a.number === b.number && a.letter === b.letter) return true;
  // Same number, opposite letter (e.g. 5A ↔ 5B)
  if (a.number === b.number && a.letter !== b.letter) return true;
  // ±range same letter, wrapping 12↔1
  if (a.letter === b.letter) {
    const diff = Math.abs(a.number - b.number);
    if (diff <= range || diff >= 12 - range) return true;
  }
  return false;
}

export function isCompatibleBPM(
  a: number,
  b: number,
  tolerance: number = 0.06
): boolean {
  if (a <= 0 || b <= 0) return false;
  // Check direct, double-time, and half-time
  const candidates = [b, b * 2, b / 2];
  for (const candidate of candidates) {
    const diff = Math.abs(candidate - a);
    // Use multiplication instead of division to avoid floating point edge cases
    if (diff <= a * tolerance + 1e-9) return true;
  }
  return false;
}

export function isTransitionable(
  a: { bpm: number; camelot: string },
  b: { bpm: number; camelot: string },
  keyRange: number = 1
): boolean {
  const ckA = parseCamelot(a.camelot);
  const ckB = parseCamelot(b.camelot);
  if (!ckA || !ckB) return false;
  return isCompatibleKey(ckA, ckB, keyRange) && isCompatibleBPM(a.bpm, b.bpm);
}

function parseCamelot(s: string): CamelotKey | null {
  const match = s.match(/^(\d{1,2})([AB])$/);
  if (!match) return null;
  const number = parseInt(match[1], 10);
  const letter = match[2] as "A" | "B";
  if (number < 1 || number > 12) return null;
  return { number, letter };
}
