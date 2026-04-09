import { defaultMessage, kindForStatus, type WeatherErrorKind } from "@/lib/errors";
import type { SuggestionItem, WeatherResponse } from "./types";

/**
 * Typed client for the Oasis proxy at `/api/weather`.
 *
 * Single responsibility: take a query string, return a `WeatherResponse`,
 * throw a `WeatherClientError` on any failure. Components consume this
 * via TanStack Query and never touch `fetch` directly.
 *
 * Network errors (proxy unreachable, DNS, etc.) are normalized into the
 * same typed error shape as upstream errors so the rendering layer has
 * one switch statement and no special cases.
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

export async function fetchWeather(query: string, signal?: AbortSignal): Promise<WeatherResponse> {
  const url = `/api/weather?q=${encodeURIComponent(query)}`;

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

  return (await res.json()) as WeatherResponse;
}

export async function fetchSearch(query: string, signal?: AbortSignal): Promise<SuggestionItem[]> {
  const url = `/api/search?q=${encodeURIComponent(query)}`;

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
      // ignore
    }
    const kind = body.error?.kind ?? kindForStatus(res.status);
    const message = body.error?.message ?? defaultMessage(kind);
    throw new WeatherClientError(kind, message);
  }

  return (await res.json()) as SuggestionItem[];
}
