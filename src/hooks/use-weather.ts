import { keepPreviousData, type UseQueryResult, useQuery } from "@tanstack/react-query";
import type { WeatherCurrent, WeatherForecast, WeatherYesterday } from "@/api/types";
import {
  fetchCurrent,
  fetchForecast,
  fetchYesterday,
  type WeatherClientError,
} from "@/api/weather";
import { normalizeQuery } from "@/lib/query";

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
 */

export type WeatherSource = "user" | "auto";

export interface UseWeatherOptions {
  /** The committed/debounced query to fetch. `null` means "do nothing". */
  query: string | null;
  source: WeatherSource;
  /** Minimum length before the query is considered active. */
  minLength?: number;
}

export type UseWeatherResult = UseQueryResult<WeatherCurrent, WeatherClientError> & {
  source: WeatherSource;
};

/**
 * Fast path: fetches `/api/weather` (current + location). Drives the
 * top-level state machine in `WeatherResult` and the source-aware error
 * policy. The other two tiers fire inside the grid once this lands.
 */
export function useWeather(options: UseWeatherOptions): UseWeatherResult {
  const { query, source, minLength = 3 } = options;
  const normalized = normalizeQuery(query) ?? "";
  const enabled = normalized.length >= minLength;

  const result = useQuery<WeatherCurrent, WeatherClientError>({
    queryKey: ["weather", "current", normalized],
    queryFn: ({ signal }) => fetchCurrent(normalized, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 120_000, // 2 min — matches the 10 min edge TTL / 5
    gcTime: 600_000, // 10 min
    meta: { source },
  });

  return Object.assign(result, { source });
}

/**
 * Deferred tier: today's min/max, 3-day forecast, astro. Edge cache is
 * 1 hour, so the client can go noticeably further — 30 min stale, 1 h
 * gc, no refetch on window focus.
 */
export function useWeatherForecast(
  query: string | null,
  minLength = 3,
): UseQueryResult<WeatherForecast, WeatherClientError> {
  const normalized = normalizeQuery(query) ?? "";
  const enabled = normalized.length >= minLength;

  return useQuery<WeatherForecast, WeatherClientError>({
    queryKey: ["weather", "forecast", normalized],
    queryFn: ({ signal }) => fetchForecast(normalized, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30 * 60_000, // 30 min
    gcTime: 60 * 60_000, // 1 h
    refetchOnWindowFocus: false,
  });
}

/**
 * Slowest tier: previous-day history. The server caches for 24 hours so
 * the client caches generously too — no point refetching something
 * whose key is rolling over at UTC midnight.
 */
export function useWeatherYesterday(
  query: string | null,
  minLength = 3,
): UseQueryResult<WeatherYesterday, WeatherClientError> {
  const normalized = normalizeQuery(query) ?? "";
  const enabled = normalized.length >= minLength;

  return useQuery<WeatherYesterday, WeatherClientError>({
    queryKey: ["weather", "yesterday", normalized],
    queryFn: ({ signal }) => fetchYesterday(normalized, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60 * 60_000, // 1 h
    gcTime: 24 * 60 * 60_000, // 24 h
    refetchOnWindowFocus: false,
    retry: 0, // yesterday failures are non-fatal; UI omits the column
  });
}
