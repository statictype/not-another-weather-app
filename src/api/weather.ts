import { defaultMessage, kindForStatus, type WeatherErrorKind } from "@/lib/errors";
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

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, signal ? { signal } : undefined);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
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

export function fetchCurrent(query: string, signal?: AbortSignal): Promise<WeatherCurrent> {
  return request<WeatherCurrent>(`/api/weather?q=${encodeURIComponent(query)}`, signal);
}

export function fetchForecast(query: string, signal?: AbortSignal): Promise<WeatherForecast> {
  return request<WeatherForecast>(`/api/weather/forecast?q=${encodeURIComponent(query)}`, signal);
}

export function fetchYesterday(query: string, signal?: AbortSignal): Promise<WeatherYesterday> {
  return request<WeatherYesterday>(`/api/weather/yesterday?q=${encodeURIComponent(query)}`, signal);
}

export function fetchSearch(query: string, signal?: AbortSignal): Promise<SuggestionItem[]> {
  return request<SuggestionItem[]>(`/api/search?q=${encodeURIComponent(query)}`, signal);
}
