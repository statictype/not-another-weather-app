import { normalizeQuery } from "./cache";
import { WeatherApiError } from "./errors";
import { errorResponse } from "./respond";
import type { Env } from "./types";
import { fetchSearch } from "./weather-api";

/** Not cached — the debounced client call rate is already low. */
export async function handleSearch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const normalized = normalizeQuery(url.searchParams.get("q"));

  if (!normalized) {
    return errorResponse("invalid_query", "Query parameter `q` is required.");
  }

  try {
    const results = await fetchSearch(normalized, env.WEATHER_API_KEY, request.signal);
    return Response.json(results);
  } catch (err) {
    if (err instanceof WeatherApiError) {
      return errorResponse(err.kind, err.message);
    }
    console.error("[oasis] unexpected search handler error", err);
    return errorResponse("upstream", "An unexpected error occurred.");
  }
}
