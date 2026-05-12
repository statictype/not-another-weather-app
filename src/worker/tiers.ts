import { WEATHER_TIER_PATHS, type WeatherTier } from "@/lib/tiers";
import {
  buildCacheKey,
  cacheGet,
  cachePut,
  CACHE_TTL_CURRENT,
  CACHE_TTL_FORECAST,
  CACHE_TTL_YESTERDAY,
  normalizeQuery,
} from "./cache";
import { WeatherApiError } from "./errors";
import { errorResponse } from "./respond";
import type { Env } from "./types";
import { fetchCurrent, fetchForecast3, fetchYesterday } from "./weather-api";

/**
 * Per-tier server configuration.
 *
 * `computeExtras` runs once per request and feeds BOTH the cache key
 * and the upstream call. Keeping it on a single computed value matters
 * for the yesterday tier near UTC midnight: a write at 23:59 and a read
 * at 00:01 must not disagree on which `dt` they reference.
 */
interface ServerTier {
  ttl: number;
  computeExtras?: () => Record<string, string>;
  fetch: (
    query: string,
    apiKey: string,
    signal: AbortSignal | undefined,
    extras: Record<string, string>,
  ) => Promise<unknown>;
}

const SERVER_TIERS: Record<WeatherTier, ServerTier> = {
  current: {
    ttl: CACHE_TTL_CURRENT,
    fetch: (q, key, signal) => fetchCurrent(q, key, signal),
  },
  forecast: {
    ttl: CACHE_TTL_FORECAST,
    fetch: (q, key, signal) => fetchForecast3(q, key, signal),
  },
  yesterday: {
    ttl: CACHE_TTL_YESTERDAY,
    computeExtras: () => ({ dt: yesterdayUtc() }),
    fetch: (q, key, signal, extras) => {
      const dt = extras["dt"];
      if (!dt) throw new Error("yesterday tier expected dt in extras");
      return fetchYesterday(q, key, dt, signal);
    },
  },
};

function yesterdayUtc(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Build the Worker handler for a given tier. Three near-identical
 * handler files used to live in this folder; the per-tier knobs
 * (TTL, fetch, optional extras) are now a table and the rest is one
 * generic function — adding a tier is one row, not a new file.
 */
export function createTierHandler(
  tier: WeatherTier,
): (request: Request, env: Env) => Promise<Response> {
  const config = SERVER_TIERS[tier];
  const cacheKeyPath = WEATHER_TIER_PATHS[tier].slice("/api".length);

  return async function tierHandler(request, env) {
    const url = new URL(request.url);
    const normalized = normalizeQuery(url.searchParams.get("q"));
    if (!normalized) {
      return errorResponse("invalid_query", "Query parameter `q` is required.");
    }

    const extras = config.computeExtras?.() ?? {};
    const cacheKey = buildCacheKey(cacheKeyPath, normalized, extras);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const hit = new Response(cached.body, cached);
      hit.headers.set("X-Oasis-Cache", "HIT");
      return hit;
    }

    try {
      const dto = await config.fetch(normalized, env.WEATHER_API_KEY, request.signal, extras);
      const response = Response.json(dto, {
        headers: {
          "Cache-Control": `public, max-age=${config.ttl}, s-maxage=${config.ttl}`,
          "X-Oasis-Cache": "MISS",
        },
      });
      await cachePut(cacheKey, response, config.ttl);
      return response;
    } catch (err) {
      if (err instanceof WeatherApiError) {
        return errorResponse(err.kind, err.message);
      }
      console.error(`[oasis] unexpected ${tier} handler error`, err);
      return errorResponse("upstream", "An unexpected error occurred.");
    }
  };
}
