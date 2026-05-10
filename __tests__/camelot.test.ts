import { describe, it, expect } from "vitest";
import {
  toCamelot,
  camelotToString,
  isCompatibleKey,
  isCompatibleBPM,
  isTransitionable,
  tonalityToCamelot,
} from "@/lib/camelot";

describe("toCamelot", () => {
  // Major keys (mode=1)
  const majorExpected: [number, string][] = [
    [0, "8B"],  // C
    [1, "3B"],  // C#
    [2, "10B"], // D
    [3, "5B"],  // Eb
    [4, "12B"], // E
    [5, "7B"],  // F
    [6, "2B"],  // F#
    [7, "9B"],  // G
    [8, "4B"],  // Ab
    [9, "11B"], // A
    [10, "6B"], // Bb
    [11, "1B"], // B
  ];

  it.each(majorExpected)(
    "maps major key=%i to %s",
    (pitchClass, expectedCamelot) => {
      const result = toCamelot(pitchClass, 1);
      expect(camelotToString(result)).toBe(expectedCamelot);
    }
  );

  // Minor keys (mode=0)
  const minorExpected: [number, string][] = [
    [0, "5A"],  // C
    [1, "12A"], // C#
    [2, "7A"],  // D
    [3, "2A"],  // Eb
    [4, "9A"],  // E
    [5, "4A"],  // F
    [6, "11A"], // F#
    [7, "6A"],  // G
    [8, "1A"],  // Ab
    [9, "8A"],  // A
    [10, "3A"], // Bb
    [11, "10A"],// B
  ];

  it.each(minorExpected)(
    "maps minor key=%i to %s",
    (pitchClass, expectedCamelot) => {
      const result = toCamelot(pitchClass, 0);
      expect(camelotToString(result)).toBe(expectedCamelot);
    }
  );

  it("returns null for key=-1 (unknown)", () => {
    expect(toCamelot(-1, 0)).toBeNull();
  });

  it("returns null for key=12 (out of range)", () => {
    expect(toCamelot(12, 1)).toBeNull();
  });
});

describe("isCompatibleKey", () => {
  it("same position is compatible (5A → 5A)", () => {
    expect(isCompatibleKey({ number: 5, letter: "A" }, { number: 5, letter: "A" })).toBe(true);
  });

  it("+1 same letter is compatible (5A → 6A)", () => {
    expect(isCompatibleKey({ number: 5, letter: "A" }, { number: 6, letter: "A" })).toBe(true);
  });

  it("-1 same letter is compatible (5A → 4A)", () => {
    expect(isCompatibleKey({ number: 5, letter: "A" }, { number: 4, letter: "A" })).toBe(true);
  });

  it("same number opposite letter is compatible (5A → 5B)", () => {
    expect(isCompatibleKey({ number: 5, letter: "A" }, { number: 5, letter: "B" })).toBe(true);
  });

  it("wraps 12 → 1 (12A → 1A)", () => {
    expect(isCompatibleKey({ number: 12, letter: "A" }, { number: 1, letter: "A" })).toBe(true);
  });

  it("wraps 1 → 12 (1A → 12A)", () => {
    expect(isCompatibleKey({ number: 1, letter: "A" }, { number: 12, letter: "A" })).toBe(true);
  });

  it("±2 same letter is NOT compatible (5A → 3A)", () => {
    expect(isCompatibleKey({ number: 5, letter: "A" }, { number: 3, letter: "A" })).toBe(false);
  });

  it("different number AND different letter is NOT compatible (5A → 6B)", () => {
    expect(isCompatibleKey({ number: 5, letter: "A" }, { number: 6, letter: "B" })).toBe(false);
  });
});

describe("isCompatibleBPM", () => {
  it("exact same BPM is compatible", () => {
    expect(isCompatibleBPM(120, 120)).toBe(true);
  });

  it("within 6% is compatible (120 → 127.2)", () => {
    expect(isCompatibleBPM(120, 127.2)).toBe(true);
  });

  it("just over 6% is NOT compatible (120 → 128)", () => {
    expect(isCompatibleBPM(120, 128)).toBe(false);
  });

  it("double-time is compatible (70 → 140)", () => {
    expect(isCompatibleBPM(70, 140)).toBe(true);
  });

  it("half-time is compatible (140 → 70)", () => {
    expect(isCompatibleBPM(140, 70)).toBe(true);
  });

  it("double-time out of range is NOT compatible (70 → 150)", () => {
    expect(isCompatibleBPM(70, 150)).toBe(false);
  });

  it("BPM of 0 is NOT compatible", () => {
    expect(isCompatibleBPM(0, 120)).toBe(false);
    expect(isCompatibleBPM(120, 0)).toBe(false);
  });
});

describe("isTransitionable", () => {
  it("compatible key AND BPM → true", () => {
    expect(
      isTransitionable(
        { bpm: 120, camelot: "5A" },
        { bpm: 124, camelot: "4A" }
      )
    ).toBe(true);
  });

  it("compatible key but NOT BPM → false", () => {
    expect(
      isTransitionable(
        { bpm: 120, camelot: "5A" },
        { bpm: 180, camelot: "4A" }
      )
    ).toBe(false);
  });

  it("compatible BPM but NOT key → false", () => {
    expect(
      isTransitionable(
        { bpm: 120, camelot: "5A" },
        { bpm: 122, camelot: "3A" }
      )
    ).toBe(false);
  });

  it("unknown camelot '?' → false", () => {
    expect(
      isTransitionable(
        { bpm: 120, camelot: "5A" },
        { bpm: 122, camelot: "?" }
      )
    ).toBe(false);
  });
});

describe("tonalityToCamelot", () => {
  const cases: [string, string][] = [
    // Minor keys
    ["Abm", "1A"], ["G#m", "1A"],
    ["Ebm", "2A"], ["D#m", "2A"],
    ["Bbm", "3A"], ["A#m", "3A"],
    ["Fm", "4A"],
    ["Cm", "5A"],
    ["Gm", "6A"],
    ["Dm", "7A"],
    ["Am", "8A"],
    ["Em", "9A"],
    ["Bm", "10A"],
    ["F#m", "11A"], ["Gbm", "11A"],
    ["Dbm", "12A"], ["C#m", "12A"],
    // Major keys
    ["B", "1B"], ["Cb", "1B"],
    ["F#", "2B"], ["Gb", "2B"],
    ["Db", "3B"], ["C#", "3B"],
    ["Ab", "4B"], ["G#", "4B"],
    ["Eb", "5B"], ["D#", "5B"],
    ["Bb", "6B"], ["A#", "6B"],
    ["F", "7B"],
    ["C", "8B"],
    ["G", "9B"],
    ["D", "10B"],
    ["A", "11B"],
    ["E", "12B"],
  ];

  it.each(cases)("maps tonality %s to %s", (tonality, expected) => {
    expect(tonalityToCamelot(tonality)).toBe(expected);
  });

  it("trims whitespace", () => {
    expect(tonalityToCamelot("  Am  ")).toBe("8A");
  });

  it("returns '?' for unknown tonality", () => {
    expect(tonalityToCamelot("Xm")).toBe("?");
    expect(tonalityToCamelot("")).toBe("?");
  });

  it("passes through Camelot notation unchanged", () => {
    expect(tonalityToCamelot("1A")).toBe("1A");
    expect(tonalityToCamelot("12B")).toBe("12B");
    expect(tonalityToCamelot("5A")).toBe("5A");
    expect(tonalityToCamelot("9B")).toBe("9B");
  });
});
