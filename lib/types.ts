export interface CamelotKey {
  number: number; // 1–12
  letter: "A" | "B"; // A = minor, B = major
}

export interface Track {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
  previewUrl: string | null;
  bpm: number;
  camelot: string; // e.g. "5A", "8B", or "?" if unknown
}
