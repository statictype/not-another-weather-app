/**
 * The three weather tiers, named once for both sides of the wire.
 *
 * Each tier has independent edge-cache TTLs, client stale windows, and
 * retry policy — those configs live next to the side that uses them
 * (`src/worker/tiers.ts`, `src/hooks/use-weather.ts`). What lives HERE
 * is just the wire-spanning identity: the set of tier names and the
 * route paths they share. Both sides key their per-tier config off
 * `WeatherTier`, so adding or renaming a tier is a single compile-time
 * propagation rather than a coordinated edit across files.
 */

export type WeatherTier = "current" | "forecast" | "yesterday";

export const WEATHER_TIER_PATHS: Record<WeatherTier, string> = {
  current: "/api/weather",
  forecast: "/api/weather/forecast",
  yesterday: "/api/weather/yesterday",
};
