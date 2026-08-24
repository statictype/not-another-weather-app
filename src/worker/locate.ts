import { defaultMessage } from "@/lib/errors";
import { buildCacheKey, cacheGet, cachePut, CACHE_TTL_LOCATION } from "./cache";
import { WeatherApiError } from "./errors";
import { foldAscii } from "./fold";
import { fetchSearch } from "./weather-api";

/** `lat,lon` from the browser's geolocation. Coordinates are already exact, so
 *  they go upstream as they are. */
const COORDINATES = /^-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?$/;

const LOCATE_PATH = "/locate";

/**
 * Resolves a query to the upstream location id both weather tiers then fetch.
 * A round trip instead of none: the fuzzy `q=` match on `current.json` and
 * `forecast.json` breaks the tie between same-named places per caller, so one
 * query can return Norway, Kansas at the edge and Norway, Iowa in dev, and the
 * two tiers can land on different cities for the same URL. `q=id:N` cannot.
 * The result is cached for a day — a city's id does not move.
 */
export async function resolveLocation(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string> {
  if (COORDINATES.test(query)) return query;

  const key = buildCacheKey(LOCATE_PATH, foldAscii(query));
  const cached = await readResolved(key);
  if (cached) return cached;

  const [first] = await fetchSearch(query, apiKey, signal);
  if (!first) throw new WeatherApiError("not_found", defaultMessage("not_found"));

  const resolved = `id:${first.id}`;
  await cachePut(key, Response.json({ resolved }), CACHE_TTL_LOCATION);
  return resolved;
}

async function readResolved(key: Request): Promise<string | null> {
  const hit = await cacheGet(key);
  if (!hit) return null;
  const body = (await hit.json().catch(() => null)) as { resolved?: unknown } | null;
  return typeof body?.resolved === "string" ? body.resolved : null;
}
