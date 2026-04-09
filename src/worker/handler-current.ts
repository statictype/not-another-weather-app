import { buildCacheKey, CACHE_TTL_CURRENT, cacheGet, cachePut, normalizeQuery } from "./cache";
import { WeatherApiError } from "./errors";
import { errorResponse } from "./respond";
import type { Env } from "./types";
import { fetchCurrent } from "./weather-api";

/**
 * GET /api/weather — fast path.
 *
 * Returns just `location + current` from WeatherAPI's `/v1/current.json`.
 * This is the LCP-critical call: the hero paints as soon as this lands,
 * without waiting on forecast or historical data.
 */
export async function handleCurrent(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const normalized = normalizeQuery(url.searchParams.get("q"));

  if (!normalized) {
    return errorResponse("invalid_query", "Query parameter `q` is required.");
  }

  const cacheKey = buildCacheKey("/weather", normalized);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    const hit = new Response(cached.body, cached);
    hit.headers.set("X-Oasis-Cache", "HIT");
    return hit;
  }

  try {
    const dto = await fetchCurrent(normalized, env.WEATHER_API_KEY, request.signal);
    const response = Response.json(dto, {
      headers: {
        "Cache-Control": `public, max-age=${CACHE_TTL_CURRENT}, s-maxage=${CACHE_TTL_CURRENT}`,
        "X-Oasis-Cache": "MISS",
      },
    });
    await cachePut(cacheKey, response, CACHE_TTL_CURRENT);
    return response;
  } catch (err) {
    if (err instanceof WeatherApiError) {
      return errorResponse(err.kind, err.message);
    }
    console.error("[oasis] unexpected current handler error", err);
    return errorResponse("upstream", "An unexpected error occurred.");
  }
}
