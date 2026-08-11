import type { WeatherClientError } from "@/api/weather";

const MAX_ECHO = 32;
const COORDS = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;

export function searchErrorMessage(
  error: WeatherClientError | null,
  query: string | null,
): string | null {
  if (!error) return null;

  if (error.kind === "invalid_query") {
    return "That didn't look like a place. Try a city name.";
  }

  if (error.kind !== "not_found") return null;

  const echo = query?.trim();
  if (!echo) return "No matching location found. Try a different spelling.";
  if (COORDS.test(echo)) return "No weather for those coordinates. Try searching by city name.";
  return `No weather for “${truncate(echo)}”. Try a different spelling.`;
}

function truncate(value: string): string {
  return value.length > MAX_ECHO ? `${value.slice(0, MAX_ECHO).trimEnd()}…` : value;
}
