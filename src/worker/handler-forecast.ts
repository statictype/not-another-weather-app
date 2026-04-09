import { buildCacheKey, CACHE_TTL_FORECAST, cacheGet, cachePut, normalizeQuery } from "./cache";
import { WeatherApiError } from "./errors";
import { errorResponse } from "./respond";
import type { Env } from "./types";
import { fetchForecast3 } from "./weather-api";

/**
 * GET /api/weather/forecast — today's min/max + 3-day forecast + astro.
 *
 * Deferred tier: the hero has already painted from the fast `current`
 * call. This endpoint populates the hero's min/max sub-row, the astro
 * card, and the forecast strip when it resolves.
 */
export async function handleForecast(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const normalized = normalizeQuery(url.searchParams.get("q"));

  if (!normalized) {
    return errorResponse("invalid_query", "Query parameter `q` is required.");
  }

  const cacheKey = buildCacheKey("/weather/forecast", normalized);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    const hit = new Response(cached.body, cached);
    hit.headers.set("X-Oasis-Cache", "HIT");
    return hit;
  }

  try {
    const dto = await fetchForecast3(normalized, env.WEATHER_API_KEY, request.signal);
    const response = Response.json(dto, {
      headers: {
        "Cache-Control": `public, max-age=${CACHE_TTL_FORECAST}, s-maxage=${CACHE_TTL_FORECAST}`,
        "X-Oasis-Cache": "MISS",
      },
    });
    await cachePut(cacheKey, response, CACHE_TTL_FORECAST);
    return response;
  } catch (err) {
    if (err instanceof WeatherApiError) {
      return errorResponse(err.kind, err.message);
    }
    console.error("[oasis] unexpected forecast handler error", err);
    return errorResponse("upstream", "An unexpected error occurred.");
  }
}
