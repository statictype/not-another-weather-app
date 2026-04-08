/**
 * Edge cache helpers for the /api/weather proxy.
 *
 * Two responsibilities:
 *  1. Normalize the user's query so cache hits are aggressive but correct.
 *     "London", " london ", "LONDON", "London  " all collapse to one entry.
 *  2. Wrap the Cache API behind a tiny domain function so the handler stays
 *     readable.
 *
 * Cache TTL is 10 minutes — weather data is stable on that horizon and the
 * savings against WeatherAPI's free tier are dramatic.
 */

export const CACHE_TTL_SECONDS = 600;

const CACHE_KEY_HOST = "https://oasis-cache.local";

/**
 * Normalize a raw user query.
 *  - Trim leading/trailing whitespace
 *  - Collapse internal whitespace runs to a single space
 *  - Lowercase
 *
 * Returns `null` if the result is empty (which the handler maps to a 400).
 */
export function normalizeQuery(raw: string | null): string | null {
  if (!raw) return null;
  const collapsed = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return collapsed.length > 0 ? collapsed : null;
}

/**
 * Build a synthetic Request to use as the Cache API key. The host is fake
 * (`oasis-cache.local`) — it's never fetched, only used to identify entries.
 * Encoding the normalized query ensures multi-word cities ("New York") and
 * accents are stable across calls.
 */
export function buildCacheKey(normalizedQuery: string): Request {
  const url = new URL("/weather", CACHE_KEY_HOST);
  url.searchParams.set("q", normalizedQuery);
  // Bump when the DTO shape changes so old entries are skipped.
  url.searchParams.set("v", "2");
  return new Request(url.toString(), { method: "GET" });
}

export async function cacheGet(key: Request): Promise<Response | undefined> {
  return caches.default.match(key);
}

export async function cachePut(key: Request, response: Response): Promise<void> {
  // Cache.put requires a body that can be re-read; clone before storing.
  // Also force a Cache-Control header so the edge respects our TTL.
  const cached = new Response(response.clone().body, response);
  cached.headers.set("Cache-Control", `public, max-age=${CACHE_TTL_SECONDS}`);
  await caches.default.put(key, cached);
}
