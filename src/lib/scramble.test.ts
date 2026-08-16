import { describe, expect, it } from "vitest";
import { scrambleFrame, sweep } from "@/lib/scramble";

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

describe("sweep", () => {
  it("steps the tiles by 50 ms in their entrance order", () => {
    expect(sweep(1)).toBe(0);
    expect(sweep(8)).toBe(350);
  });

  it("adds the within-tile offset on top of the tile's step", () => {
    expect(sweep(4, 40)).toBe(190);
  });
});
