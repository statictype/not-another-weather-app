import { describe, expect, it } from "vitest";
import { scrambleFrame, sweep, WORD_POOLS } from "@/lib/scramble";

/** Always the last member of whichever pool the character belongs to. */
const last = () => 0.999;

/** Always the first. Digits start at "0", unit letters at "b". */
const first = () => 0;

describe("scrambleFrame", () => {
  it("holds the target's length at every point in the churn", () => {
    for (let revealed = 0; revealed <= 10; revealed++) {
      expect(scrambleFrame("29.92 inHg", revealed, last)).toHaveLength(10);
    }
  });

  it("settles the revealed prefix on the target", () => {
    expect(scrambleFrame("1013 mb", 4, first).slice(0, 4)).toBe("1013");
  });

  it("leaves the glyphs with no class alone from the first frame", () => {
    const frame = scrambleFrame("29.92 inHg", 0, first);
    expect(frame[2]).toBe(".");
    expect(frame[5]).toBe(" ");
    // The one uppercase in the unit vocabulary is a landmark, not a churn.
    expect(frame[8]).toBe("H");
  });

  it("substitutes digits with digits", () => {
    expect(scrambleFrame("26°", 0, first)).toBe("00°");
    expect(scrambleFrame("26°", 0, last)).toBe("99°");
  });

  it("substitutes lowercase with the unit alphabet", () => {
    expect(scrambleFrame("9 mm", 0, first)).toBe("0 bb");
    expect(scrambleFrame("9 mm", 0, last)).toBe("9 pp");
  });

  it("returns the target once every position is revealed", () => {
    expect(scrambleFrame("12 km/h", 7, first)).toBe("12 km/h");
  });

  it("passes the em dash of an absent reading through untouched", () => {
    expect(scrambleFrame("—", 0, first)).toBe("—");
  });
});

describe("scrambleFrame with the word pools", () => {
  it("substitutes each case from its own alphabet", () => {
    expect(scrambleFrame("Sunrise", 0, first, WORD_POOLS)).toBe("Aaaaaaa");
    expect(scrambleFrame("Sunrise", 0, last, WORD_POOLS)).toBe("Zzzzzzz");
  });

  it("churns the uppercase the unit pools hold still", () => {
    expect(scrambleFrame("6:24 AM", 0, first, WORD_POOLS)).toBe("0:00 AA");
  });

  it("holds the target's length across a longer replacement", () => {
    for (let revealed = 0; revealed <= 15; revealed++) {
      expect(scrambleFrame("Waxing Gibbous", revealed, last, WORD_POOLS)).toHaveLength(14);
    }
  });

  it("leaves the punctuation of a clock reading in place", () => {
    const frame = scrambleFrame("6:24 AM", 0, last, WORD_POOLS);
    expect(frame[1]).toBe(":");
    expect(frame[4]).toBe(" ");
  });
});

describe("sweep", () => {
  it("steps the tiles by 50 ms in their entrance order", () => {
    expect(sweep(1)).toBe(0);
    expect(sweep(8)).toBe(350);
  });

  it("adds the within-tile offset on top of the tile's step", () => {
    expect(sweep(4, 40)).toBe(190);
  });
});
