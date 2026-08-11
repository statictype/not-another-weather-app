/**
 * Two-axis air comfort labels (RFC 012). Bands are lower-inclusive,
 * upper-exclusive; vocabulary and colors live in `air-comfort-palette.ts`.
 */

import {
  AC_ANCHORS,
  AIR_HUMID_PCT,
  type AirComfortBucket,
  type AirLabel,
  type ThermalLabel,
  THERMAL_BUCKET,
} from "./air-comfort-palette";

export type { AirComfortBucket, AirLabel, ThermalLabel };

export interface AirComfortInput {
  tempC: number;
  feelsLikeC: number;
  dewpointC: number;
  humidity: number;
}

export interface AirComfort {
  thermal: ThermalLabel;
  air: AirLabel;
  sentence: string;
}

export function airComfort({
  tempC,
  feelsLikeC,
  dewpointC,
  humidity,
}: AirComfortInput): AirComfort {
  const thermal = thermalLabel(feelsLikeC);
  const air: AirLabel = isDamp(tempC, humidity) ? "Damp" : airLabel(dewpointC);
  return { thermal, air, sentence: sentence(thermal, air, feelsLikeC) };
}

function thermalLabel(feelsLikeC: number): ThermalLabel {
  if (feelsLikeC < -5) return "Very cold";
  if (feelsLikeC < 4) return "Cold";
  if (feelsLikeC < 10) return "Chilly";
  if (feelsLikeC < 16) return "Cool";
  if (feelsLikeC < 22) return "Mild";
  if (feelsLikeC < 29) return "Warm";
  if (feelsLikeC < 35) return "Hot";
  if (feelsLikeC < 40) return "Very hot";
  return "Dangerously hot";
}

function airLabel(dewpointC: number): AirLabel {
  if (dewpointC < -4) return "Very dry";
  if (dewpointC < 4) return "Dry";
  if (dewpointC < 10) return "Slightly dry";
  if (dewpointC < 16) return "Comfortable";
  if (dewpointC < 21) return "Slightly humid";
  if (dewpointC < 24) return "Humid";
  return "Very humid";
}

function isDamp(tempC: number, humidity: number): boolean {
  return tempC < 12 && humidity > 80;
}

/** Joins the labels when air is `Comfortable`; `null` drops the air clause. */
type ComfortJoin = "and" | "but" | null | { join: "but"; maxFeelsLikeC: number };

const COMFORT_JOIN: Record<ThermalLabel, ComfortJoin> = {
  "Dangerously hot": null,
  "Very hot": null,
  Hot: { join: "but", maxFeelsLikeC: 32 },
  Warm: "and",
  Mild: "and",
  Cool: "but",
  Chilly: null,
  Cold: null,
  "Very cold": null,
};

function resolveJoin(rule: ComfortJoin, feelsLikeC: number): "and" | "but" | null {
  if (rule === null || typeof rule === "string") return rule;
  return feelsLikeC < rule.maxFeelsLikeC ? rule.join : null;
}

function sentence(thermal: ThermalLabel, air: AirLabel, feelsLikeC: number): string {
  const join = air === "Comfortable" ? resolveJoin(COMFORT_JOIN[thermal], feelsLikeC) : "and";
  if (join === null) return thermal;
  return `${thermal} ${join} ${air.toLowerCase()}`;
}

export interface AirComfortStyle {
  bucketClass: string;
  background: string;
}

export function airComfortStyle({
  thermal,
  air,
}: {
  thermal: ThermalLabel;
  air: AirLabel;
}): AirComfortStyle {
  const bucket = THERMAL_BUCKET[thermal];
  const pct = AIR_HUMID_PCT[air];
  const base = `color-mix(in oklch, color-mix(in oklch, var(--ac-dry), var(--ac-humid) ${pct}%), black var(--ac-base-darken))`;
  return {
    bucketClass: `ac-${bucket}`,
    background: `linear-gradient(160deg,
      color-mix(in oklch, ${base}, white var(--ac-lift)) 0%,
      ${base} 45%,
      color-mix(in oklch, ${base}, black var(--ac-shadow)) 100%)`,
  };
}

/**
 * The comfort color as ink rather than as a surface.
 *
 * `airComfortStyle` reads `--ac-dry` / `--ac-humid`, which the `.night`
 * cascade swaps for near-black anchors — correct for a card fill, invisible
 * as a mark: measured 1.00-1.04:1 against the night hero. The day anchors
 * measure 8.6-14.4:1 there, so a mark uses them in both modes and reads the
 * literal hexes instead of the mode-dependent variables.
 */
export function airComfortInk({ thermal, air }: { thermal: ThermalLabel; air: AirLabel }): string {
  const { dry, humid } = AC_ANCHORS.day[THERMAL_BUCKET[thermal]];
  return `color-mix(in oklch, ${dry}, ${humid} ${AIR_HUMID_PCT[air]}%)`;
}

/** Beaufort-scale description of a wind speed in km/h. */
export function beaufort(kph: number): string {
  if (kph < 1) return "Calm";
  if (kph < 6) return "Light air";
  if (kph < 12) return "Light breeze";
  if (kph < 20) return "Gentle breeze";
  if (kph < 29) return "Moderate breeze";
  if (kph < 39) return "Fresh breeze";
  if (kph < 50) return "Strong breeze";
  if (kph < 62) return "Near gale";
  if (kph < 75) return "Gale";
  if (kph < 89) return "Strong gale";
  if (kph < 103) return "Storm";
  if (kph < 118) return "Violent storm";
  return "Hurricane";
}
