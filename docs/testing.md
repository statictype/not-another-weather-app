# Testing

```bash
pnpm test         # watch mode
pnpm test:run     # single run
```

The suite has two projects:

- **`frontend`** runs in jsdom and tests the React app, hooks, and the API client. Mocks are at the network boundary via **MSW** so the real fetch path is exercised end-to-end. The shared server (`src/test/msw-server.ts`) is started with `onUnhandledRequest: "error"` in `src/test/setup.ts`, so any frontend code path that fetches without a matching handler in `msw-handlers.ts` fails tests loudly — add a handler when you add a new fetch.
- **`worker`** runs in workerd via `@cloudflare/vitest-pool-workers` (configured by a separate `wrangler.test.jsonc` that omits the static-asset binding, so tests don't require a prior `pnpm build`) and tests the Worker handler against `fetchMock` (an undici mock agent). Real Worker runtime, real Cache API, real bindings — no Node-side simulation.

## What's covered

- **Hooks** that hold branching logic are tested exhaustively: `useHistory`, `useUndo`, `useDebouncedValue`, `useSearchParam`, `useWeather` (+ `useWeatherForecast` / `useWeatherYesterday`).
- **Worker proxy** is tested per endpoint. `/api/weather` (current) carries the bulk of the slate — happy path with shaped DTO + `X-Oasis-Cache: MISS`, upstream code 1006 → `not_found / 404`, code 2007 → `quota_exceeded / 429`, structurally-broken body → `upstream / 502` (no vendor field names leaked), unknown upstream codes → generic `upstream / 502`, empty query → `invalid_query / 400` with no upstream call, cache `HIT` on second call, and casing/whitespace normalization. `/api/weather/forecast` repeats the shape + cache + empty-query + schema-rejection paths. `/api/weather/yesterday` instead exercises the non-fatal behavior: upstream 5xx → 200 `{ yesterday: null }`, schema-rejected body → 200 `{ yesterday: null }`, plus shape + cache (keyed per `(city, dt)`) + empty-query.
- **Lib units** with non-trivial logic — `errors.ts`, `query.ts` (normalization), `schemas.ts` (parsing), `air-comfort.ts` (heat-index scoring) — have their own focused tests.
- **Frontend API client** (`api/weather.ts`) is tested per error kind via MSW.
- **Integration** (`src/integration.test.tsx`) exercises the full URL → fetch → render → history → undo flow against the real composition. Most weather-render assertions navigate via `?city=` rather than clicking through autocomplete — that mirrors how users arrive (link sharing, bookmarks) and keeps tests decoupled from the search-bar UI. One dedicated test still covers the suggestion-click path.

## What isn't

Per-component unit tests are mostly avoided — they tend to re-implement the component in the test and break on every refactor without catching real bugs. The hook tests, lib unit tests, and integration test cover what matters. The lone exception is `components/weather/condition-icon.test.tsx`, which tests a small lookup-table component whose mapping is load-bearing for the UI.

See [RFC 006 — test strategy](./rfcs/006-test-strategy.md) for the longer rationale.
