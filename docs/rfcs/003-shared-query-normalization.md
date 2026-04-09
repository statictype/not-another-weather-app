# RFC 003 — Share query normalization between frontend and worker

## Problem

Query normalization exists twice with different rules:

- **Worker** — `src/worker/cache.ts` `normalizeQuery()` trims, lowercases,
  and collapses internal whitespace runs. Used by both `handleWeather` and
  `handleSearch` to produce the cache key.
- **Frontend** — `src/hooks/use-weather.ts:41` builds the TanStack Query
  key as `["weather", trimmed.toLowerCase()]` — trim + lowercase only, no
  whitespace collapse. `src/api/weather.ts` then `encodeURIComponent`s the
  raw query for the URL.

Consequence: `"New  York"` (two spaces) and `"New York"` produce different
TanStack Query cache keys on the client and trigger two separate fetches,
even though the worker resolves both to the same edge-cache entry. It's a
minor bug today and a latent correctness hazard as normalization rules
evolve — any future change on one side silently drifts from the other.

## Proposal

Promote `normalizeQuery` to a shared module that both the worker and the
frontend import. One source of truth, one behavior.

### File move

Move `normalizeQuery` from `src/worker/cache.ts` to a new file:

```
src/lib/query.ts
```

The function is already pure — no Cloudflare APIs, no DOM, no React — so it
can be imported by any code in the repo. Keep the same signature:

```ts
export function normalizeQuery(raw: string | null): string | null;
```

`src/worker/cache.ts` re-exports it (or just imports it) so `handler.ts` and
`search-handler.ts` don't need to change their import paths beyond swapping
`./cache` → `@/lib/query` if you want to be explicit. Either works.

### Frontend adoption

In `src/hooks/use-weather.ts`, derive the query key from `normalizeQuery`:

```ts
import { normalizeQuery } from "@/lib/query";

const normalized = normalizeQuery(query);
const enabled = (normalized?.length ?? 0) >= minLength;

useQuery({
  queryKey: ["weather", normalized],
  queryFn: ({ signal }) => fetchWeather(normalized!, signal),
  enabled,
  ...
});
```

Same change in `use-suggestions.ts` for the `["search", ...]` key.

`src/api/weather.ts` keeps `encodeURIComponent(query)` — URL encoding is a
separate concern from normalization and should stay at the HTTP boundary.
But the `query` passed to `fetchWeather` is now the normalized form, so
the wire request and the worker's normalization are aligned.

### Worker side

`src/worker/cache.ts` shrinks — it keeps `buildCacheKey`, `cacheGet`,
`cachePut`, `CACHE_TTL_SECONDS`, and re-exports `normalizeQuery` from
`@/lib/query` (or just updates callers to import it directly). No behavior
change; the worker already uses the same function.

## What is NOT changing

- No new validation layer. `normalizeQuery` keeps its single job: produce a
  canonical form or `null`. No length checks, no regex blocklist, no
  "is this a city name" logic.
- No shared URL builder. Encoding stays at the call site.
- No cross-boundary DTO sharing beyond this one function.

## Testing

- The existing worker test for `normalizeQuery` moves to
  `src/lib/query.test.ts` unchanged.
- Add one case to the `use-weather` hook test: `"New  York"` (double space)
  and `"New York"` produce the same query key → a single `useQuery`
  invocation, not two.

## Migration

Single PR:

1. Create `src/lib/query.ts` with `normalizeQuery` moved from `cache.ts`.
2. Update `worker/cache.ts`, `worker/handler.ts`, `worker/search-handler.ts`
   imports.
3. Update `hooks/use-weather.ts` and `hooks/use-suggestions.ts` to derive
   the query key from `normalizeQuery`.
4. Move the normalize test file. Add the double-space case.

No other files touched.
