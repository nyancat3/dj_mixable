import { tonalityToCamelot } from "./camelot";

export interface RekordboxTrack {
  name: string;
  artist: string;
  bpm: number;
  camelot: string;
}

/**
 * Parse a Rekordbox tab-separated text export.
 */
export function parseRekordboxTxt(text: string): RekordboxTrack[] {
  const tracks: RekordboxTrack[] = [];
  // Strip BOM if present
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/);

  const headerIdx = lines.findIndex((l) => /^#\t/.test(l));
  if (headerIdx === -1) return tracks;

  const headers = lines[headerIdx].split("\t").map((h) => h.trim().toLowerCase());
  const titleCol = headers.indexOf("track title");
  const artistCol = headers.indexOf("artist");
  const bpmCol = headers.indexOf("bpm");
  const keyCol = headers.indexOf("key");

  if (titleCol === -1) return tracks;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split("\t");

    const name = cols[titleCol]?.trim();
    if (!name) continue;

    const artist = artistCol >= 0 ? cols[artistCol]?.trim() ?? "" : "";
    const bpmStr = bpmCol >= 0 ? cols[bpmCol]?.trim() : undefined;
    const keyStr = keyCol >= 0 ? cols[keyCol]?.trim() : undefined;

    const bpm = bpmStr ? Math.round(parseFloat(bpmStr)) : 0;
    const camelot = keyStr ? tonalityToCamelot(keyStr) : "?";

    tracks.push({ name, artist, bpm, camelot });
  }

  return tracks;
}

/**
 * Parse a Rekordbox XML export string into an array of track data.
 * Uses regex-based attribute extraction to avoid XML parser dependencies
 * and eliminate XXE attack surface entirely.
 */
export function parseRekordboxXml(xml: string): RekordboxTrack[] {
  const tracks: RekordboxTrack[] = [];

  // Match both self-closing <TRACK ... /> and open <TRACK ... > elements
  // We only need attributes from the opening tag, not child elements
  const trackRegex = /<TRACK\s([^>]*?)(?:\/>|>)/gi;
  let match: RegExpExecArray | null;

  while ((match = trackRegex.exec(xml)) !== null) {
    const attrs = match[1];

    const name = extractAttr(attrs, "Name");
    const artist = extractAttr(attrs, "Artist");
    const bpmStr = extractAttr(attrs, "AverageBpm");
    const tonality = extractAttr(attrs, "Tonality");

    if (!name) continue;

    const bpm = bpmStr ? Math.round(parseFloat(bpmStr)) : 0;
    const camelot = tonality ? tonalityToCamelot(tonality) : "?";

    tracks.push({
      name,
      artist: artist ?? "",
      bpm,
      camelot,
    });
  }

  return tracks;
}

function extractAttr(tag: string, attrName: string): string | null {
  // Match Attr="value" — handles XML-escaped quotes within values
  const regex = new RegExp(`${attrName}="([^"]*)"`, "i");
  const m = tag.match(regex);
  if (!m) return null;
  // Decode XML entities
  return m[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

/**
 * Normalize a string for matching: lowercase, trim, strip feat/ft tags and brackets.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s*\(feat\.?\s[^)]*\)/gi, "")
    .replace(/\s*\(ft\.?\s[^)]*\)/gi, "")
    .replace(/\s*\[feat\.?\s[^\]]*\]/gi, "")
    .replace(/\s*\[ft\.?\s[^\]]*\]/gi, "")
    .replace(/\s*\(with\s[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize artist name for comparison:
 * handle ", " vs " & " vs " and " separators, sort parts.
 */
function normalizeArtist(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .split(/\s*[,&]\s*|\s+and\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .sort()
    .join(", ");
}

export interface MatchResult {
  bpm: number;
  camelot: string;
}

/**
 * Match Spotify tracks against Rekordbox library data.
 * Returns a Map from Spotify track ID to matched BPM/camelot data.
 */
export function matchTracks(
  spotifyTracks: { id: string; name: string; artist: string }[],
  rekordboxTracks: RekordboxTrack[]
): Map<string, MatchResult> {
  const results = new Map<string, MatchResult>();

  // Build lookup index from Rekordbox tracks: normalized "name|||artist" → track
  const exactIndex = new Map<string, RekordboxTrack>();
  const nameOnlyIndex = new Map<string, RekordboxTrack>();

  for (const rb of rekordboxTracks) {
    const nName = normalize(rb.name);
    const nArtist = normalizeArtist(rb.artist);
    const key = `${nName}|||${nArtist}`;
    if (!exactIndex.has(key)) {
      exactIndex.set(key, rb);
    }
    // Also index by name only (for fallback)
    if (!nameOnlyIndex.has(nName)) {
      nameOnlyIndex.set(nName, rb);
    }
  }

  for (const sp of spotifyTracks) {
    const nName = normalize(sp.name);
    const nArtist = normalizeArtist(sp.artist);
    const key = `${nName}|||${nArtist}`;

    // Try exact name+artist match first
    let match = exactIndex.get(key);

    // Fallback: name-only match (handles artist name differences)
    if (!match) {
      match = nameOnlyIndex.get(nName);
    }

    if (match && (match.bpm > 0 || match.camelot !== "?")) {
      results.set(sp.id, { bpm: match.bpm, camelot: match.camelot });
    }
  }

  return results;
}
