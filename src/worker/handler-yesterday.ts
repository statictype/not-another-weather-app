import { buildCacheKey, CACHE_TTL_YESTERDAY, cacheGet, cachePut, normalizeQuery } from "./cache";
import { WeatherApiError } from "./errors";
import { errorResponse } from "./respond";
import type { Env } from "./types";
import { fetchYesterday } from "./weather-api";

/**
 * GET /api/weather/yesterday — historical lookup for the previous UTC day.
 *
 * Runs on the slowest tier because this is the least important pixel on
 * the page. The cache key includes `dt` so each (city, date) pair lives
 * in its own entry; once the UTC day rolls over the old key becomes
 * unreachable, which is exactly why we cap the TTL at 24 hours.
 */
export async function handleYesterday(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const normalized = normalizeQuery(url.searchParams.get("q"));

  if (!normalized) {
    return errorResponse("invalid_query", "Query parameter `q` is required.");
  }

  const dt = yesterdayUtc();
  const cacheKey = buildCacheKey("/weather/yesterday", normalized, { dt });
  const cached = await cacheGet(cacheKey);
  if (cached) {
    const hit = new Response(cached.body, cached);
    hit.headers.set("X-Oasis-Cache", "HIT");
    return hit;
  }

  try {
    const dto = await fetchYesterday(normalized, env.WEATHER_API_KEY, dt, request.signal);
    const response = Response.json(dto, {
      headers: {
        "Cache-Control": `public, max-age=${CACHE_TTL_YESTERDAY}, s-maxage=${CACHE_TTL_YESTERDAY}`,
        "X-Oasis-Cache": "MISS",
      },
    });
    await cachePut(cacheKey, response, CACHE_TTL_YESTERDAY);
    return response;
  } catch (err) {
    if (err instanceof WeatherApiError) {
      return errorResponse(err.kind, err.message);
    }
    console.error("[oasis] unexpected yesterday handler error", err);
    return errorResponse("upstream", "An unexpected error occurred.");
  }
}

function yesterdayUtc(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
