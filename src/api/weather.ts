import { defaultMessage, kindForStatus, type WeatherErrorKind } from "@/lib/errors";
import { WEATHER_TIER_PATHS, type WeatherTier } from "@/lib/tiers";
import type { SuggestionItem, WeatherCurrent, WeatherForecast, WeatherYesterday } from "./types";

/**
 * Typed client for the Oasis proxy.
 *
 * The weather pipeline is split into three independently-cacheable
 * endpoints so the hero can paint on `current` without waiting for
 * forecast or historical data:
 *
 *   GET /api/weather            → WeatherCurrent
 *   GET /api/weather/forecast   → WeatherForecast
 *   GET /api/weather/yesterday  → WeatherYesterday
 *
 * All three failure modes (proxy unreachable, HTTP status, typed body)
 * are normalized to a single `WeatherClientError` so the rendering
 * layer has one switch statement and no special cases.
 */

export class WeatherClientError extends Error {
  constructor(
    public readonly kind: WeatherErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "WeatherClientError";
  }
}

interface ErrorBody {
  error?: { kind?: WeatherErrorKind; message?: string };
}

async function request<T>(path: string): Promise<T> {
  // Absolute URL so Node's global fetch (undici) accepts it under jsdom —
  // relative URL resolution shifted between Node 22 and 24.
  const url = new URL(path, window.location.origin);
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new WeatherClientError("network", "Could not reach the weather service.");
  }

  if (!res.ok) {
    let body: ErrorBody = {};
    try {
      body = (await res.json()) as ErrorBody;
    } catch {
      // Body wasn't JSON — fall through with empty body and use status-based fallback.
    }
    const kind = body.error?.kind ?? kindForStatus(res.status);
    const message = body.error?.message ?? defaultMessage(kind);
    throw new WeatherClientError(kind, message);
  }

  return (await res.json()) as T;
}

export function fetchTier<T>(tier: WeatherTier, query: string): Promise<T> {
  return request<T>(`${WEATHER_TIER_PATHS[tier]}?q=${encodeURIComponent(query)}`);
}

export function fetchCurrent(query: string): Promise<WeatherCurrent> {
  return fetchTier<WeatherCurrent>("current", query);
}

export function fetchForecast(query: string): Promise<WeatherForecast> {
  return fetchTier<WeatherForecast>("forecast", query);
}

export function fetchYesterday(query: string): Promise<WeatherYesterday> {
  return fetchTier<WeatherYesterday>("yesterday", query);
}

export function fetchSearch(query: string): Promise<SuggestionItem[]> {
  return request<SuggestionItem[]>(`/api/search?q=${encodeURIComponent(query)}`);
}
