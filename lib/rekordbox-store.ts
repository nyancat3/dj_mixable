import { RekordboxTrack } from "@/lib/rekordbox";

// In-memory store for Rekordbox libraries, keyed by session ID from cookie.
// Acceptable for a personal DJ tool — data is lost on server restart.
const libraries = new Map<string, RekordboxTrack[]>();

export function getLibrary(sessionId: string): RekordboxTrack[] | undefined {
  return libraries.get(sessionId);
}

export function setLibrary(sessionId: string, tracks: RekordboxTrack[]): void {
  libraries.set(sessionId, tracks);
}

export function deleteLibrary(sessionId: string): void {
  libraries.delete(sessionId);
}
