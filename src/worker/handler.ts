import { buildCacheKey, CACHE_TTL_SECONDS, cacheGet, cachePut, normalizeQuery } from "./cache";
import { statusForKind, WeatherApiError } from "./errors";
import type { Env, ErrorResponse, WeatherErrorKind } from "./types";
import { fetchForecast } from "./weather-api";

/**
 * GET /api/weather?q=<city>
 *
 * Pipeline:
 *   normalize → cache lookup → upstream fetch → DTO → cache write → respond
 *
 * Errors are caught here and rendered as a uniform JSON shape with the
 * correct HTTP status. The handler never throws.
 */
export async function handleWeather(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const normalized = normalizeQuery(url.searchParams.get("q"));

  if (!normalized) {
    return errorResponse("invalid_query", "Query parameter `q` is required.");
  }

  const cacheKey = buildCacheKey(normalized);

  const cached = await cacheGet(cacheKey);
  if (cached) {
    // Add a header so we can verify cache behavior in tests and `wrangler tail`.
    const hit = new Response(cached.body, cached);
    hit.headers.set("X-Oasis-Cache", "HIT");
    return hit;
  }

  try {
    const dto = await fetchForecast(normalized, env.WEATHER_API_KEY, request.signal);
    const response = Response.json(dto, {
      headers: {
        "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
        "X-Oasis-Cache": "MISS",
      },
    });
    // Fire-and-forget cache write — failure shouldn't block the response.
    await cachePut(cacheKey, response);
    return response;
  } catch (err) {
    if (err instanceof WeatherApiError) {
      return errorResponse(err.kind, err.message);
    }
    console.error("[oasis] unexpected handler error", err);
    return errorResponse("upstream", "An unexpected error occurred.");
  }
}

function errorResponse(kind: WeatherErrorKind, message: string): Response {
  const body: ErrorResponse = { error: { kind, message } };
  return Response.json(body, { status: statusForKind(kind) });
}
