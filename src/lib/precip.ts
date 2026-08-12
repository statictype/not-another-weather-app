/**
 * Precipitation amounts, formatted once for every surface that prints one.
 *
 * The hero's chips and the hourly strip's Precip mode both print "a chance,
 * and how much" — the same reading at two scopes. The rounding and the
 * dropped zero are the reading's rules, not either surface's, so they live
 * here and neither surface can drift from the other.
 *
 * The spoken unit is derived from the printed one rather than passed
 * alongside it: a caller cannot pair `cm` with "millimetres".
 */

const SPOKEN_UNIT = { mm: "millimetres", cm: "centimetres" } as const;

export type PrecipUnit = keyof typeof SPOKEN_UNIT;

export interface PrecipAmount {
  /** For the eye: `4mm`, `0.4mm`, `31mm`. */
  text: string;
  /** For a screen reader: `4 millimetres`. */
  spoken: string;
}

/**
 * `null` when the amount rounds to zero. `0mm` is a second way of saying
 * `0%`, and upstream reports a true `willItRain` beside a `precip_mm` of `0`.
 *
 * One decimal below 10 and none above it. The tenth is the whole reading at
 * `0.4mm` and it is noise at `31.2mm`; a fixed precision gets one of the two
 * wrong.
 */
export function precipAmount(value: number, unit: PrecipUnit): PrecipAmount | null {
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  if (rounded <= 0) return null;
  return { text: `${rounded}${unit}`, spoken: `${rounded} ${SPOKEN_UNIT[unit]}` };
}
