import { describe, it, expect } from "vitest";
import { parseRekordboxXml, matchTracks } from "@/lib/rekordbox";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="rekordbox" Version="6.0.0" Company="Pioneer DJ"/>
  <COLLECTION Entries="3">
    <TRACK TrackID="1" Name="Strobe" Artist="deadmau5" AverageBpm="128.00" Tonality="Am" />
    <TRACK TrackID="2" Name="Clarity" Artist="Zedd" AverageBpm="128.00" Tonality="Gm" />
    <TRACK TrackID="3" Name="Levels" Artist="Avicii" AverageBpm="126.00" Tonality="Cm" />
  </COLLECTION>
</DJ_PLAYLISTS>`;

describe("parseRekordboxXml", () => {
  it("parses tracks from valid XML", () => {
    const tracks = parseRekordboxXml(SAMPLE_XML);
    expect(tracks).toHaveLength(3);
    expect(tracks[0]).toEqual({
      name: "Strobe",
      artist: "deadmau5",
      bpm: 128,
      camelot: "8A",
    });
  });

  it("converts tonality to Camelot notation", () => {
    const tracks = parseRekordboxXml(SAMPLE_XML);
    expect(tracks[0].camelot).toBe("8A");  // Am
    expect(tracks[1].camelot).toBe("6A");  // Gm
    expect(tracks[2].camelot).toBe("5A");  // Cm
  });

  it("handles missing tonality", () => {
    const xml = `<DJ_PLAYLISTS><COLLECTION>
      <TRACK TrackID="1" Name="Unknown" Artist="Test" AverageBpm="120.00" />
    </COLLECTION></DJ_PLAYLISTS>`;
    const tracks = parseRekordboxXml(xml);
    expect(tracks[0].camelot).toBe("?");
  });

  it("handles missing BPM", () => {
    const xml = `<DJ_PLAYLISTS><COLLECTION>
      <TRACK TrackID="1" Name="Unknown" Artist="Test" Tonality="Am" />
    </COLLECTION></DJ_PLAYLISTS>`;
    const tracks = parseRekordboxXml(xml);
    expect(tracks[0].bpm).toBe(0);
  });

  it("handles XML entities in names", () => {
    const xml = `<DJ_PLAYLISTS><COLLECTION>
      <TRACK TrackID="1" Name="Rock &amp; Roll" Artist="Led Zeppelin" AverageBpm="120.00" Tonality="Am" />
    </COLLECTION></DJ_PLAYLISTS>`;
    const tracks = parseRekordboxXml(xml);
    expect(tracks[0].name).toBe("Rock & Roll");
  });

  it("skips tracks without Name", () => {
    const xml = `<DJ_PLAYLISTS><COLLECTION>
      <TRACK TrackID="1" Artist="Test" AverageBpm="120.00" />
      <TRACK TrackID="2" Name="Valid" Artist="Test" AverageBpm="120.00" Tonality="C" />
    </COLLECTION></DJ_PLAYLISTS>`;
    const tracks = parseRekordboxXml(xml);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe("Valid");
  });

  it("returns empty array for non-Rekordbox XML", () => {
    const xml = `<?xml version="1.0"?><html><body>Not rekordbox</body></html>`;
    const tracks = parseRekordboxXml(xml);
    expect(tracks).toHaveLength(0);
  });

  it("parses non-self-closing TRACK elements with child nodes", () => {
    const xml = `<DJ_PLAYLISTS><COLLECTION>
      <TRACK TrackID="1" Name="Deep" Artist="DJ Test" AverageBpm="124.00" Tonality="Dm">
        <TEMPO Inizio="0.051" Bpm="124.00" Metro="4/4" Battito="1"/>
        <POSITION_MARK Name="Cue1" Type="0" Start="32.5"/>
      </TRACK>
    </COLLECTION></DJ_PLAYLISTS>`;
    const tracks = parseRekordboxXml(xml);
    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toEqual({
      name: "Deep",
      artist: "DJ Test",
      bpm: 124,
      camelot: "7A",
    });
  });
});

describe("matchTracks", () => {
  const rbTracks = parseRekordboxXml(SAMPLE_XML);

  it("matches by exact name and artist", () => {
    const spotify = [
      { id: "sp1", name: "Strobe", artist: "deadmau5" },
    ];
    const matches = matchTracks(spotify, rbTracks);
    expect(matches.get("sp1")).toEqual({ bpm: 128, camelot: "8A" });
  });

  it("matches case-insensitively", () => {
    const spotify = [
      { id: "sp1", name: "strobe", artist: "Deadmau5" },
    ];
    const matches = matchTracks(spotify, rbTracks);
    expect(matches.has("sp1")).toBe(true);
  });

  it("strips feat. from track names for matching", () => {
    const spotify = [
      { id: "sp1", name: "Clarity (feat. Foxes)", artist: "Zedd" },
    ];
    const matches = matchTracks(spotify, rbTracks);
    expect(matches.get("sp1")).toEqual({ bpm: 128, camelot: "6A" });
  });

  it("falls back to name-only match", () => {
    const spotify = [
      { id: "sp1", name: "Levels", artist: "Avicii & Someone" },
    ];
    const matches = matchTracks(spotify, rbTracks);
    expect(matches.has("sp1")).toBe(true);
  });

  it("handles artist separator differences (& vs ,)", () => {
    const rbWithMultiArtist = [
      { name: "Song", artist: "Artist A, Artist B", bpm: 125, camelot: "5A" },
    ];
    const spotify = [
      { id: "sp1", name: "Song", artist: "Artist A & Artist B" },
    ];
    const matches = matchTracks(spotify, rbWithMultiArtist);
    expect(matches.has("sp1")).toBe(true);
  });

  it("returns empty map when nothing matches", () => {
    const spotify = [
      { id: "sp1", name: "Nonexistent Track", artist: "Nobody" },
    ];
    const matches = matchTracks(spotify, rbTracks);
    expect(matches.size).toBe(0);
  });
});
