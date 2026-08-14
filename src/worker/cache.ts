export { normalizeQuery } from "@/lib/query";

export const CACHE_TTL_CURRENT = 600; // 10 min
export const CACHE_TTL_FORECAST = 3600; // 1 h
export const CACHE_TTL_YESTERDAY = 86400; // 24 h

const CACHE_KEY_HOST = "https://oasis-cache.local";
const CACHE_VERSION = "6";

/** A synthetic Request used as the Cache API key; `oasis-cache.local` is never fetched. */
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
  // Cache.put needs a re-readable body, and an explicit Cache-Control for the TTL.
  const cached = new Response(response.clone().body, response);
  cached.headers.set("Cache-Control", `public, max-age=${ttl}, s-maxage=${ttl}`);
  await caches.default.put(key, cached);
}
