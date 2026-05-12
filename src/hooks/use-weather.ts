import { keepPreviousData, type UseQueryResult, useQuery } from "@tanstack/react-query";
import type { WeatherCurrent, WeatherForecast, WeatherYesterday } from "@/api/types";
import { fetchTier, type WeatherClientError } from "@/api/weather";
import { normalizeQuery } from "@/lib/query";
import type { WeatherTier } from "@/lib/tiers";

/**
 * Three parallel hooks, one per deferred tier. See `docs/rfcs/001-*.md`.
 *
 *  - `useWeather`          → current conditions only, LCP-critical
 *  - `useWeatherForecast`  → today / 3-day forecast / astro
 *  - `useWeatherYesterday` → previous-day history (lowest priority)
 *
 * All three share the same normalized query string so cache keys line
 * up with the worker's edge cache. They fire in parallel and resolve
 * independently — each card subscribes only to the query it needs.
 *
 * Per-tier knobs live in `CLIENT_TIERS` below; the three named hooks are
 * thin typed wrappers around the shared `useWeatherTier`.
 */

interface ClientTier {
  staleTime: number;
  gcTime: number;
  refetchOnWindowFocus: boolean;
  /** Omit to defer to the global retry policy in `query-client.ts`. */
  retry?: number;
}

const CLIENT_TIERS: Record<WeatherTier, ClientTier> = {
  current: {
    staleTime: 120_000, // 2 min — matches the 10 min edge TTL / 5
    gcTime: 600_000, // 10 min
    refetchOnWindowFocus: true,
  },
  forecast: {
    staleTime: 30 * 60_000, // 30 min
    gcTime: 60 * 60_000, // 1 h
    refetchOnWindowFocus: false,
  },
  yesterday: {
    staleTime: 60 * 60_000, // 1 h
    gcTime: 24 * 60 * 60_000, // 24 h
    refetchOnWindowFocus: false,
    // Non-fatal at the render layer (the grid omits the column via
    // optional chaining), so a retry would only burn cycles on an
    // outcome the UI already handles gracefully.
    retry: 0,
  },
};

export interface UseWeatherOptions {
  /** The committed query to fetch. `null` means "do nothing". */
  query: string | null;
  /** Minimum length before the query is considered active. */
  minLength?: number;
}

export type UseWeatherResult = UseQueryResult<WeatherCurrent, WeatherClientError>;

function useWeatherTier<T>(
  tier: WeatherTier,
  query: string | null,
  minLength: number,
): UseQueryResult<T, WeatherClientError> {
  const normalized = normalizeQuery(query) ?? "";
  const enabled = normalized.length >= minLength;
  const config = CLIENT_TIERS[tier];

  return useQuery<T, WeatherClientError>({
    queryKey: ["weather", tier, normalized],
    queryFn: () => fetchTier<T>(tier, normalized),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    ...(config.retry !== undefined ? { retry: config.retry } : {}),
  });
}

/**
 * Fast path: fetches `/api/weather` (current + location). Drives the
 * top-level state machine in `WeatherResult`. The other two tiers fire
 * inside the grid once this lands.
 *
 * The active query comes from the URL (`?city=`) via `useSearchParam`
 * in `App.tsx`. See docs/rfcs/007-url-driven-city.md.
 */
export function useWeather(options: UseWeatherOptions): UseWeatherResult {
  const { query, minLength = 3 } = options;
  return useWeatherTier<WeatherCurrent>("current", query, minLength);
}

/**
 * Deferred tier: today's min/max, 3-day forecast, astro.
 */
export function useWeatherForecast(
  query: string | null,
  minLength = 3,
): UseQueryResult<WeatherForecast, WeatherClientError> {
  return useWeatherTier<WeatherForecast>("forecast", query, minLength);
}

/**
 * Slowest tier: previous-day history. Non-fatal at the render layer.
 */
export function useWeatherYesterday(
  query: string | null,
  minLength = 3,
): UseQueryResult<WeatherYesterday, WeatherClientError> {
  return useWeatherTier<WeatherYesterday>("yesterday", query, minLength);
}
