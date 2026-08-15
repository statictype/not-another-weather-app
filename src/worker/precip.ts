import type { MeasurePair } from "@/lib/schemas";
import { measure } from "./format";

const SPOKEN_UNIT = { mm: "millimetres", cm: "centimetres", in: "inches" } as const;

export type MetricPrecipUnit = "mm" | "cm";

const PER_INCH = { mm: 25.4, cm: 2.54 } as const;

function decimalsFor(value: number): number {
  const magnitude = Math.abs(value);
  if (magnitude >= 10) return 0;
  if (magnitude >= 1) return 1;
  return 2;
}

function figure(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const out = safe.toFixed(decimalsFor(safe));
  return out.includes(".") ? out.replace(/0+$/, "").replace(/\.$/, "") : out;
}

function pair(value: number, unit: MetricPrecipUnit): { pair: MeasurePair; isZero: boolean } {
  const inches = Number.isFinite(value) ? value / PER_INCH[unit] : 0;
  const metricFigure = figure(value);
  const imperialFigure = figure(inches);
  return {
    pair: {
      metric: measure(metricFigure, unit, SPOKEN_UNIT[unit]),
      imperial: measure(imperialFigure, "in", SPOKEN_UNIT.in),
    },
    isZero: Number(metricFigure) === 0 || Number(imperialFigure) === 0,
  };
}

/**
 * `null` when the figure rounds to zero at its own precision in *either*
 * system. Deciding per system would show the metric viewer `0.4 mm` and the
 * imperial viewer no element at all.
 */
export function precipPair(value: number, unit: MetricPrecipUnit): MeasurePair | null {
  const { pair: measures, isZero } = pair(value, unit);
  return isZero ? null : measures;
}

/** The Now dialog names a row that always renders, so a zero is a reading. */
export function precipAmountPair(value: number, unit: MetricPrecipUnit): MeasurePair {
  return pair(value, unit).pair;
}
