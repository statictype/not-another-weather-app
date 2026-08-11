/**
 * Moon phase geometry. Returns the numbers an SVG `<path>` needs to draw the
 * lit part of the disc — no JSX, no element construction.
 *
 * The lit region is bounded by two arcs between the top and bottom poles of
 * the disc:
 *
 * 1. The **outer arc**, a semicircle of radius `r` — the moon's bright limb.
 * 2. The **terminator**, half an ellipse with the same y-radius `r` and an
 *    x-radius that shrinks to 0 at quarter phase and grows back to `r` at new
 *    and full moon.
 *
 * Both are expressed as SVG sweep flags. In SVG's y-down coordinate system a
 * sweep flag of 1 means "clockwise on screen". The outer arc is drawn top →
 * bottom, so sweep 1 puts it on the **right**. The terminator is drawn bottom
 * → top, so the same flag reverses meaning: sweep 1 puts it on the **left**.
 *
 * The two flags therefore combine like this:
 *
 * - equal flags → the arcs bow to opposite sides → half disc **plus** half
 *   ellipse → gibbous, up to a whole disc at `termRx === r`.
 * - unequal flags → both arcs bow to the same side → half disc **minus** half
 *   ellipse → crescent, down to zero area at `termRx === r`.
 *
 * In both cases the enclosed area works out to `illumination × πr²`.
 */

/** SVG arc `sweep-flag`: 1 is clockwise on screen, 0 counter-clockwise. */
export type SweepFlag = 0 | 1;

export type MoonGeometry = {
  /** Terminator ellipse x-radius, 0…r. */
  termRx: number;
  /** SVG sweep flag for the outer semicircle. */
  outerSweep: SweepFlag;
  /** SVG sweep flag for the terminator arc. */
  termSweep: SweepFlag;
};

/**
 * True for the half of the cycle where illumination is growing.
 *
 * WeatherAPI emits eight phase strings: `New Moon`, `Waxing Crescent`,
 * `First Quarter`, `Waxing Gibbous`, `Full Moon`, `Waning Gibbous`,
 * `Last Quarter`, `Waning Crescent`. Matching `waxing` or `first` classifies
 * all eight.
 *
 * `new moon` is matched explicitly for the reader, not the renderer: at
 * `k = 0` the terminator has `termRx === r` and retraces the outer arc, so the
 * path encloses zero area under either flag. The moon is drawn dark either
 * way; the branch only spares the next reader from re-deriving that.
 */
export function isWaxing(phase: string): boolean {
  const p = phase.trim().toLowerCase();
  return p.includes("waxing") || p.includes("first") || p === "new moon";
}

/**
 * @param illumination Percent lit, 0…100. Clamped.
 * @param phase        A WeatherAPI phase string; see {@link isWaxing}.
 * @param lat          Viewer latitude. Below the equator the whole figure
 *                     mirrors: a waxing moon is lit on the right from Berlin
 *                     and on the left from Sydney. `lat === 0` takes the
 *                     northern convention.
 * @param r            Disc radius in user units.
 */
export function moonGeometry(
  illumination: number,
  phase: string,
  lat: number,
  r: number,
): MoonGeometry {
  const k = Math.max(0, Math.min(100, illumination)) / 100;
  const isCrescent = k < 0.5;
  const termRx = Math.abs(1 - 2 * k) * r;

  const litOnRight = isWaxing(phase) === lat >= 0;
  const outerSweep: SweepFlag = litOnRight ? 1 : 0;
  // A crescent's terminator bows to the same side as the bright limb, which
  // — the two arcs running in opposite directions — means the opposite flag.
  const termSweep: SweepFlag = isCrescent ? flip(outerSweep) : outerSweep;

  return { termRx, outerSweep, termSweep };
}

/** The `d` attribute for the lit region, centred on `cx,cy` with radius `r`. */
export function moonLitPath(g: MoonGeometry, cx: number, cy: number, r: number): string {
  const top = `${cx},${cy - r}`;
  const bottom = `${cx},${cy + r}`;
  return `M ${top} A ${r},${r} 0 0 ${g.outerSweep} ${bottom} A ${g.termRx},${r} 0 0 ${g.termSweep} ${top} Z`;
}

function flip(f: SweepFlag): SweepFlag {
  return f === 1 ? 0 : 1;
}
