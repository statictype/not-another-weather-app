/**
 * Moon phase geometry. The lit region runs pole to pole, bounded by an outer
 * semicircle of radius `r` and a terminator half-ellipse of x-radius `termRx`.
 * The two arcs run in opposite directions, so equal sweep flags bow them apart
 * (gibbous) and unequal flags bow them the same way (crescent).
 */

/** 1 is clockwise on screen, 0 counter-clockwise. */
export type SweepFlag = 0 | 1;

export type MoonGeometry = {
  termRx: number;
  outerSweep: SweepFlag;
  termSweep: SweepFlag;
};

export function isWaxing(phase: string): boolean {
  const p = phase.trim().toLowerCase();
  return p.includes("waxing") || p.includes("first") || p === "new moon";
}

/** `lat` mirrors the figure: waxing is lit on the right in the north, left in the south. */
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
  const termSweep: SweepFlag = isCrescent ? flip(outerSweep) : outerSweep;

  return { termRx, outerSweep, termSweep };
}

export function moonLitPath(g: MoonGeometry, cx: number, cy: number, r: number): string {
  const top = `${cx},${cy - r}`;
  const bottom = `${cx},${cy + r}`;
  return `M ${top} A ${r},${r} 0 0 ${g.outerSweep} ${bottom} A ${g.termRx},${r} 0 0 ${g.termSweep} ${top} Z`;
}

function flip(f: SweepFlag): SweepFlag {
  return f === 1 ? 0 : 1;
}
