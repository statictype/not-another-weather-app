import { describe, expect, it } from "vitest";
import { isWaxing, moonGeometry, moonLitPath, type MoonGeometry } from "./moon";

/** The radius `astro-card.tsx` draws the moon at. */
const R = 22;
const DISC = Math.PI * R * R;

/**
 * Area enclosed by the two-arc path, derived from the SVG sweep-flag
 * semantics rather than from the module's branches: the arcs run in opposite
 * directions, so equal flags bow to opposite sides (half disc plus half
 * ellipse) and unequal flags bow to the same side (half disc minus half
 * ellipse).
 */
function litArea(g: MoonGeometry, r: number): number {
  const half = (Math.PI * r * r) / 2;
  const lens = (Math.PI * g.termRx * r) / 2;
  return g.outerSweep === g.termSweep ? half + lens : half - lens;
}

/** Which side of the disc the bright limb sits on. */
function litSide(g: MoonGeometry): "left" | "right" {
  return g.outerSweep === 1 ? "right" : "left";
}

interface Row {
  /** Exactly as WeatherAPI emits it. */
  phase: string;
  illumination: number;
  waxing: boolean;
  /** Bright limb as seen from the northern hemisphere. */
  north: "left" | "right";
}

/** All eight phase strings WeatherAPI emits, at representative illuminations. */
const phases: Row[] = [
  { phase: "New Moon", illumination: 0, waxing: true, north: "right" },
  { phase: "Waxing Crescent", illumination: 25, waxing: true, north: "right" },
  { phase: "First Quarter", illumination: 50, waxing: true, north: "right" },
  { phase: "Waxing Gibbous", illumination: 75, waxing: true, north: "right" },
  { phase: "Full Moon", illumination: 100, waxing: false, north: "left" },
  { phase: "Waning Gibbous", illumination: 75, waxing: false, north: "left" },
  { phase: "Last Quarter", illumination: 50, waxing: false, north: "left" },
  { phase: "Waning Crescent", illumination: 25, waxing: false, north: "left" },
];

const BERLIN = 52.52;
const SYDNEY = -33.87;

describe("isWaxing", () => {
  it.each(phases)("classifies $phase", ({ phase, waxing }) => {
    expect(isWaxing(phase)).toBe(waxing);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(isWaxing("  WAXING GIBBOUS ")).toBe(true);
    expect(isWaxing("waning gibbous")).toBe(false);
  });
});

describe("moonGeometry", () => {
  describe("lit area matches illumination", () => {
    it.each(phases)("$phase at $illumination%", ({ phase, illumination }) => {
      for (const lat of [BERLIN, SYDNEY]) {
        const g = moonGeometry(illumination, phase, lat, R);
        expect(litArea(g, R)).toBeCloseTo((illumination / 100) * DISC, 6);
      }
    });
  });

  describe("bright limb sits on the correct side", () => {
    it.each(phases)("$phase", ({ phase, illumination, north }) => {
      const south = north === "right" ? "left" : "right";
      expect(litSide(moonGeometry(illumination, phase, BERLIN, R))).toBe(north);
      expect(litSide(moonGeometry(illumination, phase, SYDNEY, R))).toBe(south);
    });
  });

  it("draws a fully lit disc at 100%", () => {
    for (const lat of [BERLIN, SYDNEY]) {
      const g = moonGeometry(100, "Full Moon", lat, R);
      expect(g.termRx).toBe(R);
      expect(g.termSweep).toBe(g.outerSweep);
      expect(litArea(g, R)).toBeCloseTo(DISC, 6);
    }
  });

  it("draws nothing at 0%", () => {
    for (const lat of [BERLIN, SYDNEY]) {
      const g = moonGeometry(0, "New Moon", lat, R);
      expect(g.termRx).toBe(R);
      expect(litArea(g, R)).toBeCloseTo(0, 6);
    }
  });

  it("draws a sliver on the near limb at 1% waxing", () => {
    const north = moonGeometry(1, "Waxing Crescent", BERLIN, R);
    expect(litSide(north)).toBe("right");
    expect(litArea(north, R)).toBeCloseTo(0.01 * DISC, 6);

    const south = moonGeometry(1, "Waxing Crescent", SYDNEY, R);
    expect(litSide(south)).toBe("left");
    expect(litArea(south, R)).toBeCloseTo(0.01 * DISC, 6);
  });

  it("degenerates the terminator to a straight line at quarter phase", () => {
    expect(moonGeometry(50, "First Quarter", BERLIN, R).termRx).toBe(0);
    expect(moonGeometry(50, "Last Quarter", BERLIN, R).termRx).toBe(0);
  });

  it("takes the northern convention at the equator", () => {
    expect(moonGeometry(25, "Waxing Crescent", 0, R)).toEqual(
      moonGeometry(25, "Waxing Crescent", BERLIN, R),
    );
  });

  it("clamps illumination to 0…100", () => {
    expect(moonGeometry(-20, "Waning Crescent", BERLIN, R)).toEqual(
      moonGeometry(0, "Waning Crescent", BERLIN, R),
    );
    expect(moonGeometry(140, "Waxing Gibbous", BERLIN, R)).toEqual(
      moonGeometry(100, "Waxing Gibbous", BERLIN, R),
    );
  });

  it("scales the terminator with the radius", () => {
    expect(moonGeometry(75, "Waxing Gibbous", BERLIN, 18).termRx).toBeCloseTo(9, 6);
    expect(moonGeometry(75, "Waxing Gibbous", BERLIN, 22).termRx).toBeCloseTo(11, 6);
  });
});

describe("moonLitPath", () => {
  it("closes both arcs on the poles of the disc", () => {
    const g = moonGeometry(75, "Waxing Gibbous", BERLIN, R);
    expect(moonLitPath(g, 160, 42, R)).toBe("M 160,20 A 22,22 0 0 1 160,64 A 11,22 0 0 1 160,20 Z");
  });

  it("mirrors both sweep flags below the equator", () => {
    const g = moonGeometry(75, "Waxing Gibbous", SYDNEY, R);
    expect(moonLitPath(g, 160, 42, R)).toBe("M 160,20 A 22,22 0 0 0 160,64 A 11,22 0 0 0 160,20 Z");
  });
});
