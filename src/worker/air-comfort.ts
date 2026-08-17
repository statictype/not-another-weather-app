import type { AirComfort, AirLabel, ThermalLabel } from "@/lib/schemas";

export interface AirComfortInput {
  tempC: number;
  feelsLikeC: number;
  dewpointC: number;
  humidity: number;
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
