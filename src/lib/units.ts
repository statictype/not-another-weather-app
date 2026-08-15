import type { Measure, MeasurePair } from "@/lib/schemas";

export const UNIT_SYSTEMS = ["metric", "imperial"] as const;

export type UnitSystem = (typeof UNIT_SYSTEMS)[number];

export function isUnitSystem(value: unknown): value is UnitSystem {
  return typeof value === "string" && (UNIT_SYSTEMS as readonly string[]).includes(value);
}

const ABSENT: Measure = { text: "—", value: "—", suffix: "", spoken: "—" };

/** A browser can hold a body from before the pairs existed — `max-age` is 10 min
 *  on `current` and 1 h on `forecast`. Every call site goes through this. */
export function read(pair: MeasurePair | null | undefined, system: UnitSystem): Measure {
  return pair?.[system] ?? ABSENT;
}
