# RFC 006 — Test strategy across the refactor batch

Cross-cutting audit of the test suite after RFCs 001–005. Goal: close
real coverage gaps introduced by the refactors without adding
redundant or low-signal tests.

## Current inventory (post-RFC)

| File                                    | Count | Scope                                                           |
| --------------------------------------- | ----- | --------------------------------------------------------------- |
| `src/worker.test.ts`                    | 14    | Three endpoints × (happy / error kinds / cache / normalize)     |
| `src/api/weather.test.ts`               | 5     | `fetchCurrent` only — success, typed errors, network, fallback  |
| `src/hooks/use-weather.test.tsx`        | 5     | `useWeather` (current tier) only — disabled / success / error   |
| `src/hooks/use-history.test.ts`         | 9     | Reducer + store + hook pub/sub + cross-tab                      |
| `src/hooks/use-undo.test.ts`            | \~5   | Timeout-bounded pending-removal                                 |
| `src/hooks/use-debounced-value.test.ts` | \~3   | Debounce semantics                                              |
| `src/lib/errors.test.ts`                | 3     | `kindForStatus` is inverse of `statusForKind`; message coverage |
| `src/lib/query.test.ts`                 | 3     | `normalizeQuery` trim / lowercase / whitespace collapse         |
| `src/integration.test.tsx`              | 3     | Full search → fetch → render → history → undo flow              |
| `src/App.test.tsx`                      | 2     | Smoke — header + empty state                                    |

**Total:** 52 tests, all green.

## Coverage gaps introduced by the refactors

### RFC 001 (three-tier split) — **most gaps, highest priority**

Two of the three new frontend hooks have **no tests**:

- `useWeatherForecast(query)` — no success / error / disabled cases.
- `useWeatherYesterday(query)` — no success / error / `retry: 0` /
  "non-fatal failure returns null" cases.

Two of the three new client-side fetch functions have **no tests**:

- `fetchForecast(query)` — no parse / error / network path coverage.
- `fetchYesterday(query)` — same.

The integration test does **not** verify the streaming paint order. All
three MSW handlers resolve instantly, so the test would pass even if the
hero blocked on yesterday (the bug the refactor was meant to fix).
**This is the refactor's load-bearing behavior and it's untested.**

The new card components have no dedicated tests. Most cards are too
trivial to warrant one, but three have real branching logic that
deserves coverage:

- `condition-icon.tsx` — 20-line regex chain picking a lucide icon
  from a weather description string. Easy to break by reordering the
  regex branches. Worth a table-driven test.
- `hero-card.tsx`'s `HeroStatsRow` — renders a shimmer when `today` is
  `undefined` and the real numbers when present. A 5-line test
  verifies the shimmer → real transition.
- `forecast-card.tsx` — composes skeleton rows + loaded rows depending
  on whether `forecast` and `yesterday` are defined. Four states
  worth exercising.

The per-card inline formatters (`beaufort`, `compassDegrees`,
`uvLabel`, `uvTint`, `forecastLabel`, `formatClock`) are **private**
to their card files. Per the no-overengineering rule they don't get
shared-lib extraction, so they can't be imported and tested directly.
See "Strategy for inline formatters" below.

### RFC 002 (search-bar split)

No coverage change needed. The integration test already exercises the
full search → suggestion select → dropdown close flow, and the split
was a pure file move with no logic edits. A focused unit test per
split file would duplicate the integration test without adding signal.

### RFC 003 (shared query normalization)

`src/lib/query.test.ts` covers the function directly. The frontend
didn't gain a test for "double-space and single-space share a cache
key" — worth adding as a quick hook-level assertion against
`useWeather`'s `queryKey`.

### RFC 004 (error taxonomy registry)

`src/lib/errors.test.ts` is comprehensive for the table. The worker
test covers 1006 / 2007 / 2006 / empty-query at the `/api/weather`
endpoint only. After RFC 001 it also covers the other two endpoints
for empty-query but **not** all upstream error codes at each endpoint.
The error taxonomy is shared, so covering every code × every endpoint
is redundant — current state (all codes on current, just empty-query
on forecast / yesterday) is the right balance.

### RFC 005 (split use-history)

No coverage change needed. The existing 9 tests already cover the
reducer + store + hook. The split was a pure file move.

## New tests to add

Small batch, high signal. Each is justified by a concrete bug the
refactor made possible or a load-bearing behavior it introduced.

### 1. `src/hooks/use-weather.test.tsx` — add forecast and yesterday hook cases

Extend the existing file (don't create new ones — they'd share fixtures).
Five new tests:

- `useWeatherForecast` disabled when query is too short.
- `useWeatherForecast` returns shaped DTO on success.
- `useWeatherForecast` surfaces typed errors with the correct kind.
- `useWeatherYesterday` returns `{ yesterday: null }` happy path.
- `useWeatherYesterday` does **not** retry on failure (validates the
  `retry: 0` setting; use a mock that throws and assert `error` is
  reached without multiple invocations).

### 2. `src/api/weather.test.ts` — add forecast and yesterday fetch cases

Three new tests, mirroring the existing `fetchCurrent` style:

- `fetchForecast` parses success.
- `fetchYesterday` parses success.
- `fetchForecast` maps 404 → `not_found`. (One error path is
  enough — the underlying `request()` helper is shared, so
  exhaustive per-function error tests duplicate coverage.)

### 3. `src/integration.test.tsx` — add a streaming paint test

**The most important new test.** This is the only way to guarantee
that the three-tier refactor achieves its stated goal (hero paints
before forecast paints before yesterday paints).

MSW supports `await delay(ms)` inside handlers. Wire the three
handlers with staggered delays: current = immediate, forecast = 100ms,
yesterday = 200ms. Then:

1. Click a suggestion.
2. Assert hero condition text is visible **before** assertion 3.
3. Assert the 3-day forecast row is visible **before** assertion 4.
4. Assert the "Yesterday" column is visible.

The assertions use `findByText` / `findByLabelText` which already
await via RTL's `waitFor`. Order the `await`s sequentially and the
test will fail if a later tier renders before an earlier one, because
RTL's wait timeout is shorter than the next delay.

To make this robust and fast, use delays of 0 / 30 / 60 ms — long
enough for React to commit in between, short enough to keep the test
under 300 ms.

### 4. `src/components/weather/condition-icon.test.tsx` — table-driven

The only card-level test worth writing. Import `ConditionIcon` and
render it into a container, reading the `data-lucide` / `aria-label`
of the underlying SVG or checking the rendered node's display name.
Twelve rows covering the distinct regex branches:

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

### 5. `src/hooks/use-weather.test.tsx` — whitespace cache-key regression

One test asserting that `useWeather({ query: "New  York" })` produces
the same queryKey as `useWeather({ query: "New York" })`. Protects the
RFC 003 bugfix from regressing.

## Tests NOT worth adding

Listing these explicitly so future contributors don't add them by
reflex.

- **Per-card render tests** for hero / atmosphere / wind / UV /
  local-time / astro. These are ~40-line presentational components
  that take primitive props. The integration test covers the render
  path end-to-end. A unit test would just re-describe the JSX.
- **Per-formatter tests** for `beaufort` / `compassDegrees` / `uvLabel` /
  `uvTint` / `forecastLabel`. Extracting them to a shared lib would
  let us test them directly — and we decided not to. Their output is
  exercised transitively via the integration test's rendered DOM.
  If a specific one ever starts failing in production, that's the
  signal to extract and test it.
- **File-existence tests** for the RFC 002 / 005 file splits. Nothing
  to test — if the imports resolve, the split worked.
- **Per-endpoint × per-error-kind tests** on the worker. The taxonomy
  is shared; covering all five error kinds on the `current` endpoint
  plus empty-query on the other two is sufficient.
- **Snapshot tests**. Lock in visual drift without catching logic
  bugs. Explicitly out of scope for this project per the README.

## Strategy for inline formatters

The formatters live inside card files (`beaufort` in `wind-card.tsx`,
`uvLabel` in `uv-card.tsx`, etc.) and are not exported. This is
intentional per the "no shared format library" decision in RFC 001.

Testing them directly would require either exporting them (leaking
module-private helpers) or duplicating them in the test file (stale
the moment the real one changes). Neither is worth it.

The pragmatic approach: **rely on the integration test for happy-path
coverage, and only extract a formatter when it grows enough branching
to warrant its own file.** The condition-icon picker already crossed
that bar (20 lines of regex, shared between two cards) which is why
it lives in `condition-icon.tsx` and gets a dedicated test in this
RFC. The others haven't — they're 10-line switch-or-ladder functions
exercised transitively by the fixture data in `integration.test.tsx`.

If one of them ever regresses silently, the fix is:

1. Extract to a sibling file next to the card.
2. Export it.
3. Write a table-driven test for the buckets.

Don't pre-emptively refactor.

## Streaming test — implementation sketch

Since the streaming test in item 3 is the most novel addition, here's
the concrete shape:

```tsx
import { delay, HttpResponse, http } from "msw";

it("paints the hero before forecast before yesterday", async () => {
  server.use(
    http.get("/api/weather", async () => {
      return HttpResponse.json(londonCurrent); // instant
    }),
    http.get("/api/weather/forecast", async () => {
      await delay(40);
      return HttpResponse.json(londonForecast);
    }),
    http.get("/api/weather/yesterday", async () => {
      await delay(80);
      return HttpResponse.json({ yesterday: londonYesterdayDay });
    }),
  );

  renderApp();
  const user = userEvent.setup();

  await user.type(screen.getByLabelText(/city/i), "London");
  await user.click(await screen.findByRole("button", { name: /search weather for london/i }));

  // t=0: hero visible
  await screen.findByText(/partly cloudy/i);
  // At this instant the forecast skeleton must still be visible.
  // (Implementation detail: forecast-card renders 3 skeleton divs with
  // aria-hidden="true" and animate-pulse. Assert one is present.)
  expect(document.querySelector("[aria-hidden='true'].animate-pulse")).toBeInTheDocument();

  // t=40ms: forecast lands
  await screen.findByText(/Today/i); // "Today" label only renders with real forecast data

  // t=80ms: yesterday lands
  await screen.findByText(/Yesterday/i);
});
```

The assertion order matters: RTL's `findBy*` will poll until the
timeout, so if yesterday somehow arrived before forecast, the
`findByText(/Today/i)` call would still eventually succeed — but the
intermediate assertion about the still-visible forecast skeleton would
fail, catching the regression.

If in practice this is flaky (possible — MSW delays under Vitest
workers can jitter), fall back to asserting only the final state and
dropping the paint-order check, with a comment explaining why.

## Migration / plan

All new tests land in existing files or one new file (`condition-icon.test.tsx`).
Rough order:

1. Add the `fetchForecast` / `fetchYesterday` tests to
   `src/api/weather.test.ts`.
2. Add the `useWeatherForecast` / `useWeatherYesterday` / whitespace
   regression cases to `src/hooks/use-weather.test.tsx`.
3. Create `src/components/weather/condition-icon.test.tsx` with the
   twelve-row table.
4. Add the streaming paint test to `src/integration.test.tsx`.
5. Run `pnpm run ci` — should stay green, total ≈ 65 tests.

Nothing gets deleted — the refactor batch already dropped the
monolithic handler / weather-card tests when their source files went
away.
