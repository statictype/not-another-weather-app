const SPOKEN_UNIT = { mm: "millimetres", cm: "centimetres" } as const;

export type PrecipUnit = keyof typeof SPOKEN_UNIT;

export interface PrecipAmount {
  text: string;
  spoken: string;
}

/**
 * `null` when the amount rounds to zero — upstream reports a true `willItRain`
 * beside a `precip_mm` of `0`. One decimal below 10, none above.
 */
export function precipAmount(value: number, unit: PrecipUnit): PrecipAmount | null {
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  if (rounded <= 0) return null;
  return { text: `${rounded}${unit}`, spoken: `${rounded} ${SPOKEN_UNIT[unit]}` };
}
