/**
 * Edge cache helpers for the Oasis weather proxy.
 *
 * The cache is a request coalescer: when many concurrent clients ask for
 * the same thing, upstream gets hit once. TTLs are sized by the window
 * in which a given entry is still going to be read, not by how long its
 * underlying data is technically valid.
 *
 * Three tiers match the three split endpoints:
 *   - current  (10 min)  — current weather changes; 10 min coalesces bursts.
 *   - forecast (1 hour)  — 3-day forecasts are updated ~hourly upstream.
 *   - yesterday (24 h)   — upper bound on useful lifetime; the key becomes
 *                          unreachable after the UTC day rolls over.
 */

export { normalizeQuery } from "@/lib/query";

export const CACHE_TTL_CURRENT = 600; // 10 min
export const CACHE_TTL_FORECAST = 3600; // 1 h
export const CACHE_TTL_YESTERDAY = 86400; // 24 h

const CACHE_KEY_HOST = "https://oasis-cache.local";
const CACHE_VERSION = "5";

/**
 * Build a synthetic Request to use as the Cache API key. The host is
 * fake (`oasis-cache.local`) — it's never fetched, only used to identify
 * entries. Including `path` keeps the three endpoints in distinct
 * namespaces; `extraParams` lets the yesterday key carry its `dt` so
 * each (city, date) pair gets its own entry.
 */
export function buildCacheKey(
  path: string,
  normalizedQuery: string,
  extraParams?: Record<string, string>,
): Request {
  const url = new URL(path, CACHE_KEY_HOST);
  url.searchParams.set("q", normalizedQuery);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, v);
    }
  }
  // Bump when a DTO shape changes so old entries are skipped.
  url.searchParams.set("v", CACHE_VERSION);
  return new Request(url.toString(), { method: "GET" });
}

export async function cacheGet(key: Request): Promise<Response | undefined> {
  return caches.default.match(key);
}

export async function cachePut(key: Request, response: Response, ttl: number): Promise<void> {
  // Cache.put requires a body that can be re-read; clone before storing.
  // Also force a Cache-Control header so the edge respects our TTL.
  const cached = new Response(response.clone().body, response);
  cached.headers.set("Cache-Control", `public, max-age=${ttl}, s-maxage=${ttl}`);
  await caches.default.put(key, cached);
}
