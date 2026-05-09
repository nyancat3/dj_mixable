import { describe, it, expect } from "vitest";
import { extractPlaylistId } from "@/lib/spotify";

describe("extractPlaylistId", () => {
  it("extracts ID from full web URL", () => {
    expect(
      extractPlaylistId(
        "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
      )
    ).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });

  it("extracts ID from URL with query params", () => {
    expect(
      extractPlaylistId(
        "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123"
      )
    ).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });

  it("extracts ID from Spotify URI", () => {
    expect(
      extractPlaylistId("spotify:playlist:37i9dQZF1DXcBWIGoYBM5M")
    ).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });

  it("accepts raw 22-char ID", () => {
    expect(extractPlaylistId("37i9dQZF1DXcBWIGoYBM5M")).toBe(
      "37i9dQZF1DXcBWIGoYBM5M"
    );
  });

  it("trims whitespace", () => {
    expect(extractPlaylistId("  37i9dQZF1DXcBWIGoYBM5M  ")).toBe(
      "37i9dQZF1DXcBWIGoYBM5M"
    );
  });

  it("returns null for invalid input", () => {
    expect(extractPlaylistId("not-a-valid-url")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractPlaylistId("")).toBeNull();
  });

  it("returns null for too-short ID", () => {
    expect(extractPlaylistId("abc123")).toBeNull();
  });
});
