import { keepPreviousData, type UseQueryResult, useQuery } from "@tanstack/react-query";
import type { WeatherCurrent, WeatherForecast, WeatherYesterday } from "@/api/types";
import { fetchTier, type WeatherClientError } from "@/api/weather";
import { normalizeQuery } from "@/lib/query";
import type { WeatherTier } from "@/lib/tiers";

interface ClientTier {
  staleTime: number;
  gcTime: number;
  refetchOnWindowFocus: boolean;
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
    // Non-fatal at the render layer — the grid omits the column.
    retry: 0,
  },
};

export interface UseWeatherOptions {
  query: string | null;
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

export function useWeather(options: UseWeatherOptions): UseWeatherResult {
  const { query, minLength = 3 } = options;
  return useWeatherTier<WeatherCurrent>("current", query, minLength);
}

export function useWeatherForecast(
  query: string | null,
  minLength = 3,
): UseQueryResult<WeatherForecast, WeatherClientError> {
  return useWeatherTier<WeatherForecast>("forecast", query, minLength);
}

export function useWeatherYesterday(
  query: string | null,
  minLength = 3,
): UseQueryResult<WeatherYesterday, WeatherClientError> {
  return useWeatherTier<WeatherYesterday>("yesterday", query, minLength);
}
