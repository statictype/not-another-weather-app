# RFC 006 — Test strategy across the refactor batch

> **Revised** after RFCs 007 (URL-driven city) and 008 (zod at wire
> boundaries) shipped. The revision simplifies the paint-order test
> (URL navigation instead of click-through), swaps hand-maintained
> DTO fixtures for a schema smoke test, and pins the hero-unique text
> assertion that avoided the "Partly cloudy" double-match race
> discovered while implementing 007.

Cross-cutting audit of the test suite after RFCs 001–005, 007, 008.
Goal: close real coverage gaps introduced by the refactor batch
without adding redundant or low-signal tests.

## Current inventory (post-RFC 008)

| File                                    | Count | Scope                                                                                |
| --------------------------------------- | ----- | ------------------------------------------------------------------------------------ |
| `src/worker.test.ts`                    | 14    | Three endpoints × (happy / error kinds / cache / normalize)                          |
| `src/api/weather.test.ts`               | 5     | `fetchCurrent` only — success, typed errors, network, fallback                       |
| `src/hooks/use-weather.test.tsx`        | 4     | `useWeather` (current tier) only — disabled / null / success / typed error           |
| `src/hooks/use-history.test.ts`         | 9     | Reducer + store + hook pub/sub + cross-tab                                           |
| `src/hooks/use-undo.test.ts`            | \~5   | Timeout-bounded pending-removal                                                      |
| `src/hooks/use-debounced-value.test.ts` | \~3   | Debounce semantics                                                                   |
| `src/lib/errors.test.ts`                | 3     | `kindForStatus` is inverse of `statusForKind`; message coverage                      |
| `src/lib/query.test.ts`                 | 3     | `normalizeQuery` trim / lowercase / whitespace collapse                              |
| `src/integration.test.tsx`              | 5     | URL-driven render + empty state + suggestion-click + validation error + undo restore |
| `src/App.test.tsx`                      | 2     | Smoke — header + empty state                                                         |

**Total:** 53 tests, all green.

## Coverage gaps after the refactor batch

### RFC 001 (three-tier split) — **largest gap**

Two of the three frontend hooks still have no tests:

- `useWeatherForecast(query)` — no success / error / disabled cases.
- `useWeatherYesterday(query)` — no cases at all; the `retry: 0`
  setting is behaviorally load-bearing (yesterday failures must be
  non-fatal) and completely unverified.

Two of the three client-side fetch functions likewise have no tests:

- `fetchForecast(query)` — no parse / error / network path.
- `fetchYesterday(query)` — same.

The integration test does not verify the **streaming paint order**.
All three MSW handlers resolve instantly today, so the suite would
pass even if the hero secretly blocked on yesterday — the exact bug
RFC 001 was meant to fix. This is the refactor's load-bearing
behavior and it's unverified.

The new card components have no dedicated tests. Most are too trivial
to warrant one, but three have real branching logic that deserves
coverage:

- `condition-icon.tsx` — 20-line regex chain picking a lucide icon.
  Easy to break by reordering branches. Table-driven test.
- `hero-card.tsx`'s `HeroStatsRow` — renders a shimmer when `today`
  is `undefined` and the real numbers when present. Tiny focused
  test for the skeleton → real transition.
- `forecast-card.tsx` — four states depending on whether `forecast`
  and `yesterday` are defined.

The per-card inline formatters (`beaufort`, `compassDegrees`,
`uvLabel`, `uvTint`, `forecastLabel`, `formatClock`) remain private
to their card files. Per the "no shared format library" decision,
they stay there. See "Strategy for inline formatters" below.

### RFC 007 (URL-driven city state)

Partially covered by the existing `renderAppAt("/?city=London")`
integration test, but two specific behaviors aren't verified:

- **The `main.tsx` bootstrap.** On cold load with no URL param and
  non-empty history, `?city=history[0].query` should be written via
  `replaceState` before React mounts. Nothing tests this today — the
  integration tests import `App` directly and don't run `main.tsx`.
- **`setSearchParam` → URL change → hook re-fire.** The suggestion-click
  test checks the URL updates, but doesn't directly assert the
  `popstate` / manual-notify path. Covered implicitly by the
  successful hero render in that test, but a narrower hook test would
  catch regressions faster.

### RFC 008 (zod at wire boundaries)

Two behaviors worth covering:

- **Shared schemas parse representative fixtures.** A tiny smoke test
  per schema asserting "valid fixture parses; broken fixture throws"
  protects against silent shape drift when someone edits
  `src/lib/schemas.ts`.
- **Worker maps `ZodError` to `upstream` / 502.** No test today
  exercises the path where the upstream returns structurally valid
  JSON but with a wrong field type (e.g. `temp_c: "hot"`). The
  handler should respond 502 with kind `upstream` and the message
  should not leak the field name or the literal vendor response.

### RFC 003 (shared query normalization)

The worker normalize is tested. The frontend gained no test that the
`queryKey` collapses `"New  York"` and `"New York"` to the same
entry. Small addition against `useWeather`.

### RFCs 002, 004, 005

No coverage change needed. All three were pure file moves (002, 005)
or a taxonomy consolidation (004) that is already covered at both
ends.

## New tests to add

Small batch, high signal. Each is justified by a concrete behavior
the refactor batch introduced or a known-load-bearing invariant.

### 1. `src/lib/schemas.test.ts` — new file

One `describe` per schema, two tests each: one accepts a canonical
fixture, one rejects a structurally-invalid variant. ~10 tests total.

```ts
import { describe, expect, it } from "vitest";
import { WeatherCurrentSchema, ForecastDaySchema, ... } from "./schemas";

describe("WeatherCurrentSchema", () => {
  it("parses a canonical fixture", () => { ... });
  it("rejects wrong-type temp", () => {
    expect(() =>
      WeatherCurrentSchema.parse({ ...fixture, current: { ...fixture.current, tempC: "hot" } })
    ).toThrow();
  });
});
```

Why worth it: edits to `schemas.ts` are the single point where DTO
drift happens, and the frontend imports types-only so drift won't
surface until runtime. These tests are the drift tripwire.

### 2. `src/hooks/use-weather.test.tsx` — add forecast, yesterday, whitespace

Five new tests:

- `useWeatherForecast` disabled when query is too short.
- `useWeatherForecast` returns shaped DTO on success.
- `useWeatherForecast` surfaces typed errors with the correct kind.
- `useWeatherYesterday` returns `{ yesterday: null }` on happy path.
- `useWeatherYesterday` does **not** retry on failure. Mock throws,
  assert `queryFn` called exactly once. Protects `retry: 0`.
- `useWeather({ query: "New  York" })` and `useWeather({ query: "New York" })`
  produce the same `queryKey`. Protects the RFC 003 whitespace fix.

### 3. `src/api/weather.test.ts` — add forecast and yesterday fetch cases

Three new tests mirroring the existing `fetchCurrent` style:

- `fetchForecast` parses success.
- `fetchYesterday` parses success.
- `fetchForecast` maps 404 → `not_found`. (One error path per
  function is enough — the underlying `request()` helper is shared.)

### 4. `src/worker.test.ts` — add one schema-rejection case

Three new tests, one per endpoint. Each mocks the upstream to return
a valid HTTP 200 with a structurally broken body (e.g. `temp_c: "hot"`
for current, `mintemp_c: null` for forecast, missing `forecastday`
for yesterday). Assert:

- Response status is 502.
- Response body has `error.kind === "upstream"`.
- Response body message does NOT leak the upstream field name.

For the yesterday case specifically: assert the response is still
`200` with `{ yesterday: null }` — history parse failures are
non-fatal, same contract as upstream fetch failures.

### 5. `src/components/weather/condition-icon.test.tsx` — new file

Table-driven, twelve rows covering the distinct regex branches in
`pickConditionIcon`. Render `<ConditionIcon text={...} isDay={...} />`
and assert the rendered SVG's `aria-label` or the wrapping element
identity matches the expected lucide component.

| input                    | isDay | expected icon        |
| ------------------------ | ----- | -------------------- |
| "Thunderstorm"           | true  | `CloudLightningIcon` |
| "Light snow"             | true  | `CloudSnowIcon`      |
| "Mist"                   | true  | `CloudFogIcon`       |
| "Patchy rain"            | true  | `CloudSunRainIcon`   |
| "Patchy rain"            | false | `CloudMoonRainIcon`  |
| "Light drizzle"          | true  | `CloudDrizzleIcon`   |
| "Torrential rain shower" | true  | `CloudRainWindIcon`  |
| "Moderate rain"          | true  | `CloudRainIcon`      |
| "Partly cloudy"          | true  | `CloudSunIcon`       |
| "Partly cloudy"          | false | `CloudMoonIcon`      |
| "Overcast"               | true  | `CloudIcon`          |
| "Clear"                  | false | `MoonStarIcon`       |

### 6. `src/integration.test.tsx` — streaming paint-order test

**The single most important new test.** This is the only way to
guarantee that RFC 001 achieves its stated goal: hero paints before
forecast paints before yesterday paints.

MSW supports `await delay(ms)` inside handlers. Wire the three
handlers with staggered delays: current = 0ms, forecast = 30ms,
yesterday = 60ms. Then navigate directly to the URL (no click-through
— simpler and closer to how a user arrives at a shared link):

```ts
import { delay, HttpResponse, http } from "msw";

it("paints the hero before forecast before yesterday", async () => {
  server.use(
    http.get("/api/weather", () => HttpResponse.json(londonCurrent)),
    http.get("/api/weather/forecast", async () => {
      await delay(30);
      return HttpResponse.json(londonForecast);
    }),
    http.get("/api/weather/yesterday", async () => {
      await delay(60);
      return HttpResponse.json({ yesterday: londonYesterdayDay });
    }),
  );

  renderAppAt("/?city=London");

  // t≈0: hero painted, forecast + yesterday show skeletons
  await screen.findByText(/feels like 11/i); // hero-unique
  expect(document.querySelector("[aria-hidden='true'].animate-pulse")).toBeInTheDocument();

  // t≈30ms: forecast lands; "Today" label only exists with real forecast data
  await screen.findByText(/^today$/i);

  // t≈60ms: yesterday lands
  await screen.findByText(/^yesterday$/i);
});
```

Two important details learned while implementing RFC 007:

- **Use the hero-unique `feels like 11` assertion, not
  `/partly cloudy/i`.** "Partly cloudy" appears both in the hero and
  in the forecast row once the forecast lands, so a regex match
  throws "multiple elements" in a flaky race-dependent way. The
  "Feels like 11°" text only exists inside `HeroCard`.
- **Assertions must be awaited in sequence, not parallel.** RTL's
  `findBy*` polls until its timeout. If yesterday somehow lands
  before forecast (the bug we're guarding against), the
  `findByText(/^today$/i)` call still eventually succeeds — but the
  **skeleton-present** assertion in between catches the regression
  because by the time forecast has landed, the skeleton is gone.

If this turns out to be flaky under vitest workers (MSW delays can
jitter), fall back to asserting only the final state with a comment.
The sketch above is the target, not the fallback.

### 7. `src/hooks/use-search-param.test.tsx` — new file

Three focused tests for the custom URL hook from RFC 007:

- `useSearchParam("city")` returns the current value from
  `window.location.search`.
- `setSearchParam("city", "paris")` updates the URL and triggers a
  re-render (via `renderHook` + `result.current` comparison).
- `popstate` event triggers a re-render.

Short — ~20 lines total. Guards the `useSyncExternalStore` wiring.

### 8. Optional: `src/main.bootstrap.test.ts` — bootstrap behavior

The `main.tsx` bootstrap cannot be tested by importing `App` because
it runs before `createRoot(...).render()`. A focused test would have
to import `main.tsx` itself (running the bootstrap) and assert the
URL was rewritten from history.

Complication: importing `main.tsx` also calls `createRoot` and
mounts the app, which is heavy for a bootstrap-only test. The
cleanest fix is to extract the bootstrap into a tiny standalone
function (`src/lib/bootstrap-url.ts`) and test that function in
isolation.

**Decision: defer the refactor-for-testability.** The bootstrap is
5 lines, already manually verified to work, and the return on
testing it is low. Add a TODO comment in `main.tsx` noting that a
future test would require this extraction. If we ever regress the
bootstrap behavior, do the extraction then.

## Tests NOT worth adding

Listed explicitly so future contributors don't add them by reflex.

- **Per-card render tests** for hero / atmosphere / wind / UV /
  local-time / astro (other than the specific tests in item 5).
  Integration test covers the render path end-to-end; a unit test
  would just re-describe the JSX.
- **Per-formatter tests** for `beaufort` / `compassDegrees` /
  `uvLabel` / `uvTint` / `forecastLabel`. Extracting them to test
  them directly would contradict the "no shared format library"
  decision. Exercised transitively via the integration fixtures.
- **File-existence tests** for the RFC 002 / 005 file splits.
- **Client-side schema validation tests.** RFC 008 deliberately does
  not parse responses client-side (zero-bundle constraint). There's
  nothing to test.
- **Per-endpoint × per-error-kind tests** on the worker. The
  taxonomy is shared (RFC 004); covering all kinds on the current
  endpoint plus empty-query + schema-rejection on the other two is
  sufficient.
- **Snapshot tests.** Lock in visual drift without catching logic
  bugs. Out of scope per the README.

## Strategy for inline formatters

Unchanged from the original RFC. Formatters live inside card files
and are not exported. Rely on the integration test for happy-path
coverage. Extract a formatter only when it crosses a complexity
threshold (like `pickConditionIcon` already did) — and when it does,
extract it to a sibling file and give it a table-driven test. Don't
pre-emptively refactor.

## Implementation order

All new tests land in existing files or two new files
(`schemas.test.ts`, `condition-icon.test.tsx`, `use-search-param.test.tsx`).
Rough sequence:

1. `schemas.test.ts` — fastest to write, protects RFC 008.
2. Extend `use-weather.test.tsx` with the forecast / yesterday /
   whitespace cases.
3. Extend `api/weather.test.ts` with `fetchForecast` / `fetchYesterday`.
4. Extend `worker.test.ts` with the three schema-rejection cases.
5. New `condition-icon.test.tsx`.
6. New `use-search-param.test.tsx`.
7. New streaming paint-order test in `integration.test.tsx`.
8. Run `pnpm run ci` — expected total ~75 tests.

Nothing gets deleted — the earlier refactor batch already dropped
the monolithic handler / weather-card tests when their source files
went away.
