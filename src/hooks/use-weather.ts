import { keepPreviousData, type UseQueryResult, useQuery } from "@tanstack/react-query";
import type { WeatherResponse } from "@/api/types";
import { fetchWeather, type WeatherClientError } from "@/api/weather";

/**
 * The fetch source matters for error rendering: errors from auto-loads
 * (e.g. on mount restoring the most recent history item) are silent
 * unless they explain a global degradation, while errors from explicit
 * user actions surface as inline validation.
 */
export type WeatherSource = "user" | "auto";

export interface UseWeatherOptions {
  /** The committed/debounced query to fetch. `null` means "do nothing". */
  query: string | null;
  source: WeatherSource;
  /** Minimum length before the query is considered active. */
  minLength?: number;
}

export type UseWeatherResult = UseQueryResult<WeatherResponse, WeatherClientError> & {
  source: WeatherSource;
};

/**
 * useQuery wrapper for `/api/weather`.
 *
 *  - Disabled when `query` is null/empty/below minLength so we don't
 *    fire a fetch on every keystroke.
 *  - Forwards the AbortSignal so a stale request gets cancelled when
 *    the query changes (TanStack Query passes one in).
 *  - Carries `source` through `meta` so the renderer can decide whether
 *    an error is loud or silent.
 */
export function useWeather(options: UseWeatherOptions): UseWeatherResult {
  const { query, source, minLength = 3 } = options;
  const trimmed = query?.trim() ?? "";
  const enabled = trimmed.length >= minLength;

  const result = useQuery<WeatherResponse, WeatherClientError>({
    queryKey: ["weather", trimmed.toLowerCase()],
    queryFn: ({ signal }) => fetchWeather(trimmed, signal),
    enabled,
    // Keep the last successful payload on screen while a new query is
    // loading — avoids flicker and lets us drop a manual `lastResult` cache.
    placeholderData: keepPreviousData,
    meta: { source },
  });

  return Object.assign(result, { source });
}
