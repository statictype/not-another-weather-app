/**
 * Two-axis air comfort labels — see plan.md and file.md.
 *
 * Bands read as `≥ lower AND < upper` (lower-inclusive, upper-exclusive),
 * which is what the strictly-less-than ladders below encode.
 */

export type ThermalLabel =
  | "Very cold"
  | "Cold"
  | "Chilly"
  | "Cool"
  | "Mild"
  | "Warm"
  | "Hot"
  | "Very hot"
  | "Dangerously hot";

export type AirLabel =
  | "Very dry"
  | "Dry"
  | "Slightly dry"
  | "Comfortable"
  | "Slightly humid"
  | "Humid"
  | "Very humid"
  | "Damp";

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
  const air: AirLabel = isDamp(tempC, humidity)
    ? "Damp"
    : airLabel(dewpointC);
  return { thermal, air, sentence: `${thermal} and ${air.toLowerCase()}` };
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

export type AirComfortBucket =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "silver";

const THERMAL_BUCKET: Record<ThermalLabel, AirComfortBucket> = {
  "Dangerously hot": "red",
  "Very hot":        "red",
  "Hot":             "orange",
  "Warm":            "yellow",
  "Mild":            "green",
  "Cool":            "blue",
  "Chilly":          "blue",
  "Cold":            "silver",
  "Very cold":       "silver",
};

const AIR_HUMID_PCT: Record<AirLabel, number> = {
  "Very dry":        0,
  "Dry":            15,
  "Slightly dry":   30,
  "Comfortable":    50,
  "Slightly humid": 65,
  "Humid":          80,
  "Very humid":    100,
  "Damp":           90,
};

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
