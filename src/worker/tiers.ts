import { WEATHER_TIER_PATHS, type WeatherTier } from "@/lib/tiers";
import {
  buildCacheKey,
  cacheGet,
  cachePut,
  CACHE_TTL_CURRENT,
  CACHE_TTL_FORECAST,
  normalizeQuery,
} from "./cache";
import { WeatherApiError } from "./errors";
import { errorResponse } from "./respond";
import type { Env } from "./types";
import { fetchCurrent, fetchForecast } from "./weather-api";

interface ServerTier {
  ttl: number;
  fetch: (query: string, apiKey: string, signal: AbortSignal | undefined) => Promise<unknown>;
}

const SERVER_TIERS: Record<WeatherTier, ServerTier> = {
  current: {
    ttl: CACHE_TTL_CURRENT,
    fetch: (q, key, signal) => fetchCurrent(q, key, signal),
  },
  forecast: {
    ttl: CACHE_TTL_FORECAST,
    fetch: (q, key, signal) => fetchForecast(q, key, signal),
  },
};

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

    const cacheKey = buildCacheKey(cacheKeyPath, normalized);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const hit = new Response(cached.body, cached);
      hit.headers.set("X-Oasis-Cache", "HIT");
      return hit;
    }

    try {
      const dto = await config.fetch(normalized, env.WEATHER_API_KEY, request.signal);
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
