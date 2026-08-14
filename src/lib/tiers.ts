/** Names and paths only. Per-tier config lives in `worker/tiers.ts` and `use-weather.ts`. */

export type WeatherTier = "current" | "forecast";

export const WEATHER_TIER_PATHS: Record<WeatherTier, string> = {
  current: "/api/weather",
  forecast: "/api/weather/forecast",
};
