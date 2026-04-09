# RFC 001 — Three-tier streaming split of the weather pipeline

> **Status:** supersedes the original RFC 001 (single-endpoint split).
> The constraints changed once we committed to a premium perceived-latency
> target and a 10/10 Lighthouse score: the upstream yesterday call was
> identified as a blocker on LCP, and the old "one query, many subscribers"
> plan left that on the critical path.

## Problem

Today's pipeline is one endpoint → one DTO → one 546-LOC `WeatherCard`:

1. `GET /api/weather?q=...` calls **two** upstream endpoints in parallel
   (`/v1/forecast.json?days=3` and `/v1/history.json`) and awaits both
   before responding. The critical path is `max(forecast, history)` ≈
   300–500 ms.
2. `<WeatherCard>` destructures the entire DTO and renders 7 sections plus
   ~10 inline helpers. Every section re-renders on every refetch and the
   local-time 1-second tick re-renders the whole card.
3. Nothing is visible until the slowest upstream call resolves. The LCP
   element (the big current temperature) is blocked on historical yesterday
   data that isn't even in the hero.

## Goals

- Paint the hero (current temperature) as fast as physically possible.
- Let astro / 3-day forecast / yesterday stream in independently as each
  lands, with zero layout shift.
- Cache each tier at the TTL that matches its actual mutability (yesterday
  is immutable — cache for months, not minutes).
- Split the UI into independent cards so the 1-second local-time tick
  stops re-rendering the entire weather view.

## Proposal

Three backend endpoints, three client queries, seven independent card
components. Each card subscribes only to the query it needs.

### Backend — three endpoints

| Endpoint                     | Upstream call(s)             | Returns                      | `Cache-Control`                                    |
| ---------------------------- | ---------------------------- | ---------------------------- | -------------------------------------------------- |
| `GET /api/weather`           | `/v1/current.json`           | `{ location, current }`      | `public, max-age=600, s-maxage=600` (10 min)       |
| `GET /api/weather/forecast`  | `/v1/forecast.json?days=3`   | `{ today, forecast, astro }` | `public, max-age=3600, s-maxage=3600` (1 hour)     |
| `GET /api/weather/yesterday` | `/v1/history.json?dt=<date>` | `{ yesterday }`              | `public, max-age=86400, s-maxage=86400` (24 hours) |

### Cache TTL reasoning

The edge cache is a **request coalescer**, not an archive — its only job
is to let N concurrent users share one upstream call. TTLs are sized by
the period during which a given entry will still be read, not by how
long its data is technically valid.

- **current (10 min)**: current weather changes; 10 min coalesces burst
  traffic without staleness risk.
- **forecast (1 hour)**: 3-day forecasts are updated hourly by most
  provider models. No `stale-while-revalidate` — SWR would burn upstream
  quota on background refreshes.
- **yesterday (24 hours)**: the upper bound on useful lifetime. The
  handler computes `dt = today_UTC - 1` fresh on every request, so once
  the UTC day rolls over the old cache key is unreachable forever. A
  longer TTL would only hoard dead entries.

`/api/weather` becomes a strictly smaller, strictly faster call — just
current weather from WeatherAPI's `/current.json`. No forecast, no astro,
no history. Everything not in that tier is deferred.

### Edge cache keys

Today's `buildCacheKey` uses a single synthetic path `/weather` keyed on
the normalized query plus a version. The three endpoints need distinct
keys or they collide:

```
/weather?q=<normalized>&v=5                            # current
/weather/forecast?q=<normalized>&v=5                   # forecast+astro+today
/weather/yesterday?q=<normalized>&dt=<YYYY-MM-DD>&v=5  # historical
```

The yesterday key includes `dt` so each city × date pair gets its own
entry that rolls over naturally at day boundaries and can be cached for
months without staleness risk. Version bumped to `v=5` so existing v=4
entries (which carry the combined DTO) get skipped cleanly.

### DTO types

Replace the monolithic `WeatherResponse` with three narrow DTOs:

```ts
// src/api/types.ts
export interface WeatherCurrent {
  location: { name; region; country; localTime; tz; lat; lon };
  current: {
    tempC;
    feelsLikeC;
    conditionText;
    conditionCode;
    timeOfDay;
    windKph;
    windDir;
    gustKph;
    humidity;
    pressureMb;
    visibilityKm;
    uv;
    cloud;
    dewpointC;
    precipMm;
  };
}

export interface WeatherForecast {
  today: { minC; maxC; chanceOfRain };
  forecast: ForecastDay[]; // 3 days
  astro: Astro;
}

export interface WeatherYesterday {
  yesterday: ForecastDay | null;
}
```

`WeatherResponse`, `WeatherErrorKind` reuse stays as is. `ForecastDay` and
`Astro` types stay.

### Frontend — three parallel hooks

```ts
// src/hooks/use-weather.ts (rewritten)
export function useWeatherCurrent(query: string | null): UseQueryResult<WeatherCurrent>;
export function useWeatherForecast(query: string | null): UseQueryResult<WeatherForecast>;
export function useWeatherYesterday(query: string | null): UseQueryResult<WeatherYesterday>;
```

Each is a thin `useQuery` wrapper with its own `queryKey`, `staleTime`,
and `gcTime`:

| Hook                  | `queryKey`                    | `staleTime` | `gcTime` | `refetchOnWindowFocus` |
| --------------------- | ----------------------------- | ----------- | -------- | ---------------------- |
| `useWeatherCurrent`   | `["weather", "current", q]`   | 2 min       | 10 min   | true                   |
| `useWeatherForecast`  | `["weather", "forecast", q]`  | 30 min      | 1 h      | false                  |
| `useWeatherYesterday` | `["weather", "yesterday", q]` | 1 h         | 24 h     | false                  |

All three fire in parallel on city select. TanStack Query's structural
sharing plus React Compiler's auto-memoization mean per-card re-renders
are automatic — no manual `React.memo` needed.

### Component layout

```
src/components/weather/
  grid.tsx             # layout shell; fires the three queries, distributes props
  hero-card.tsx        # current + forecast's today (sub-row shimmers until ready)
  atmosphere-card.tsx  # current
  local-time-card.tsx  # current (location.tz only)
  wind-card.tsx        # current
  uv-card.tsx          # current
  astro-card.tsx       # forecast
  forecast-card.tsx    # forecast days 2–3 + yesterday
  hero-stats-row.tsx   # the max/min/rain sub-row inside hero-card; skeleton until forecast lands
```

The grid shell owns the three `useQuery` calls. It destructures the data
once per query and passes narrow prop slices to each card. Cards receive
primitives only — no DTO passthrough, no query key plumbing.

Hero card gets two props: the `current` slice (immediate) and an optional
`today` slice (undefined until `useWeatherForecast` resolves). A
`<HeroStatsRow>` sub-component shows a shimmer bar when `today` is
undefined and the real numbers when it arrives. The shimmer and the real
row have identical heights so there is **zero layout shift**.

Forecast card subscribes to both `forecast` and `yesterday`. It renders
three day-skeletons initially; as `forecast` lands, days 2–3 populate; as
`yesterday` lands, the leftmost "Yesterday" column slides in. Again, the
day-row skeleton matches the final row height exactly.

Astro card shows a skeleton until `forecast` lands, then its three
sub-rows populate.

### Render timeline on a cold city select

| t      | Event                                                                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0      | user selects city → three fetches fire in parallel                                                                                                                   |
| ~150ms | `current` lands → hero (minus stats row) + atmosphere + local-time + wind + UV all paint. **LCP element paints here.** Astro + forecast + hero stats show skeletons. |
| ~350ms | `forecast` lands → astro card, forecast days 2–3, hero stats row populate in place                                                                                   |
| ~500ms | `yesterday` lands → "Yesterday" column slides into the forecast card                                                                                                 |

Three paint events, each at its natural latency, each visibly "streaming
in" — premium feel and a clear story for the interview demo.

### Error handling

The existing `WeatherResult` state machine handles asymmetric error
policy (quota wins, system errors take over only when there's no data).
With three queries, we need to think about partial failures:

- **`current` fails**: the whole grid can't render. Fall through to the
  existing error/empty states in `WeatherResult`. Same UX as today.
- **`forecast` fails**: hero stats row keeps its skeleton permanently
  (bad) or collapses to empty (OK). Astro card shows "No data". Forecast
  card shows "Forecast unavailable". We still show the hero.
- **`yesterday` fails**: yesterday column is omitted. Same as today.

Quota applies to any of the three and still wins.

### Worker implementation

`src/worker/weather-api.ts` grows three exported functions:

```ts
export async function fetchCurrent(q, key, signal): Promise<WeatherCurrent>;
export async function fetchForecast3(q, key, signal): Promise<WeatherForecast>;
export async function fetchYesterday(q, key, signal): Promise<WeatherYesterday>;
```

`fetchCurrent` calls `/v1/current.json`. `fetchForecast3` calls
`/v1/forecast.json?days=3` and shapes `today + forecast + astro` from it
(throwing away `current`, which the fast endpoint already served).
`fetchYesterday` is the existing function, renamed and returned as a
`WeatherYesterday` (not `ForecastDay | null` directly).

Three handlers in `src/worker/`:

```
handler-current.ts
handler-forecast.ts
handler-yesterday.ts
```

`src/worker.ts` router dispatches to each by path. `handler-yesterday.ts`
computes the UTC `dt` string and passes it into the cache key.

## Non-goals

- No SSR, no streaming server rendering, no HTTP trailers. All streaming
  is client-side: multiple fetches, multiple paint events. Cloudflare
  Workers can stream but the complexity isn't worth it for three tiny
  JSON payloads.
- No shared format library. Formatters stay inline next to their one
  caller per card.
- No `React.memo`. React Compiler handles it.
- No view-model layer. Grid destructures and distributes.

## Testing

Covered in the dedicated test RFC (#7). At minimum:

- Worker: three handler tests, each with success + upstream error + cache
  hit. Yesterday test asserts the cache key includes `dt` and verifies
  the 60-day `Cache-Control`.
- Frontend: three new hook tests (one per query), plus an integration
  test that asserts the three-stage paint — hero visible before forecast,
  forecast visible before yesterday — using delayed MSW handlers.
- Delete the existing monolithic handler test and monolithic `useWeather`
  test.

## Migration

One PR, roughly in this order:

1. Split `src/api/types.ts` into the three DTOs (keep old aliases during
   the transition).
2. Add `fetchCurrent` / `fetchForecast3` / refactored `fetchYesterday` in
   `src/worker/weather-api.ts`.
3. Split `src/worker/handler.ts` into three handlers; update the router
   in `src/worker.ts`; update `buildCacheKey` to take a path + extra
   params.
4. Rewrite `src/hooks/use-weather.ts` to export the three hooks.
5. Create `src/components/weather/` grid + 7 card files + `hero-stats-row`.
   Copy JSX + helpers out of `weather-card.tsx` per card.
6. Replace `<WeatherCard>` in `weather-result.tsx` with the grid, and
   switch `weather-result` to drive off `useWeatherCurrent` for its
   state-machine decisions (current is the hard dependency).
7. Delete `src/components/weather-card.tsx`.
8. Update integration test for the three-stage paint.
9. Bump edge cache version to `v=5`.
