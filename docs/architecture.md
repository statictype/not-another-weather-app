# Architecture

## Module layout

```
src/
├── worker.ts              # Worker entry: dispatches /api/* routes, falls through to ASSETS
├── worker/                # Backend (Cloudflare Worker), one file per endpoint
│   ├── handler-current.ts    # GET /api/weather             (current conditions, 10 min cache)
│   ├── handler-forecast.ts   # GET /api/weather/forecast    (today + 3-day + astro + hourly, 1 h cache)
│   ├── handler-yesterday.ts  # GET /api/weather/yesterday   (previous-day history, 24 h cache, non-fatal)
│   ├── search-handler.ts     # GET /api/search              (autocomplete, no edge cache — `useSuggestions` keeps a 60 s client-side stale window)
│   ├── weather-api.ts        # Upstream client + DTO shaping + error mapping
│   ├── cache.ts              # Cache API helpers (per-endpoint TTL)
│   ├── respond.ts            # Shared JSON / cache-header response builders
│   ├── errors.ts             # WeatherApiError + upstream-code → kind mapping
│   └── types.ts              # Env binding type
├── api/                   # Frontend API client
│   ├── weather.ts         # fetch wrappers (current / forecast / yesterday / search) — throws WeatherClientError
│   └── types.ts           # Type-only re-exports from @/lib/schemas + SuggestionItem
├── hooks/
│   ├── use-debounced-value.ts
│   ├── use-media-query.ts       # SSR-safe matchMedia subscription
│   ├── use-search-param.ts      # ?city= as a useSyncExternalStore source
│   ├── use-suggestions.ts       # Autocomplete query (debounced 300ms, 3-char min)
│   ├── use-undo.ts              # Pending-removal state machine
│   ├── use-weather.ts           # Three TanStack Query hooks: current / forecast / yesterday
│   └── use-history/             # Reducer + in-module pub/sub over localStorage
├── components/
│   ├── search-bar/        # Composite search input (dropdown, suggestions, recent, clear-all)
│   ├── weather/           # The card grid — hero, hourly, forecast, astro, atmosphere, wind, etc.
│   ├── weather-result.tsx # State-machine container (drives off `current` only)
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   ├── quota-exceeded-state.tsx
│   ├── weather-skeleton.tsx
│   └── ui/                # shadcn/ui primitives (vendored — ESLint ignores this folder)
├── lib/
│   ├── schemas.ts         # Zod DTOs — single source of truth for the wire boundary (RFC 008)
│   ├── errors.ts          # Error taxonomy table (kind ↔ status ↔ message)
│   ├── query.ts           # normalizeQuery — shared by worker cache key + frontend query key
│   ├── query-client.ts    # TanStack Query config + retry policy
│   ├── air-comfort.ts     # Heat-index / humidity comfort scoring used by AirComfortCard
│   ├── random-cities.ts   # Pool for the "surprise me" button
│   └── utils.ts           # cn() helper
├── test/                  # MSW server + setup (frontend project only)
├── App.tsx                # Composition
├── main.tsx               # Root, QueryClient, URL bootstrap from history (replaceState)
└── integration.test.tsx   # End-to-end-ish coverage of the URL → fetch → render → history flow
```

## Design choices

- **Single Cloudflare Worker hosts both surfaces.** The same `wrangler deploy` ships the SPA bundle (via the static-asset binding) and the four `/api/*` endpoints. The upstream API key lives only on the server side and never reaches the browser, and proxy + frontend share an origin so there's no CORS to wire up.
- **Three-tier weather pipeline.** Rather than one fat `/api/weather` call, the worker exposes `current`, `forecast`, and `yesterday` as independent endpoints with TTLs sized to their volatility (10 min / 1 h / 24 h). The hero paints from `current` alone (LCP-critical), and the forecast + yesterday tiers stream in inside the grid. `yesterday` is treated as non-fatal — upstream failures resolve to `{ yesterday: null }` so the rest of the page still renders. See RFC 001.
- **Shaped DTOs defined once, in zod.** `src/lib/schemas.ts` is the single source of truth for every wire shape. The worker value-imports the schemas to validate upstream responses; the frontend type-imports only, so zod's runtime is tree-shaken out of the client bundle. An ESLint rule blocks runtime zod imports in `src/{api,hooks,components}`. See RFC 008.
- **Edge cache with query normalization.** Each weather endpoint caches successful responses at the edge (10 min / 1 h / 24 h), keyed on a normalized query (trimmed, lowercased, internal whitespace collapsed). `London`, `london`, `LONDON`, and `London ` all share one cache entry per endpoint. The autocomplete endpoint (`/api/search`) is intentionally not edge-cached — results are ephemeral and the client-side debounce + 60 s `staleTime` keeps the upstream call rate low. `normalizeQuery` in `src/lib/query.ts` is shared by the worker's cache key and the frontend's TanStack Query key so the two sides can't drift.
- **Closed error union end-to-end.** Both worker and frontend client model errors as a discriminated union (`not_found | quota_exceeded | invalid_query | upstream | network`) defined in a single table (`src/lib/errors.ts`) that derives the kind ↔ status ↔ default-message mappings. Adding a kind is a one-row change that TypeScript propagates.
- **Retry policy follows the error taxonomy.** `src/lib/query-client.ts` skips retry on the three user-meaningful kinds (`not_found`, `invalid_query`, `quota_exceeded`) so the UI reacts instantly. Transient network and upstream failures retry up to 2 times with exponential backoff capped at 5 s. `useWeatherYesterday` further overrides `retry: 0` to honour the tier's non-fatal contract.
- **URL is the source of truth for the active city.** `?city=…` drives every fetch. `main.tsx` bootstraps the URL from history with `replaceState` on cold load, so returning users still see their last city — but from the first paint the URL accurately reflects what's on screen. Because every fetch is now legitimately the user's intent, there is no "silent fallback" — failed system fetches (network/upstream) take over the result area with a retry CTA. See RFC 007.
- **Autocomplete is the debounced surface, weather fetches are not.** Suggestions (`/api/search`) fire 300 ms after idle typing, gated at 3 chars. The actual weather fetch only fires when the URL changes — selecting a suggestion, picking from recent history, geolocation, or "surprise me". TanStack Query dedupes identical keys and `placeholderData: keepPreviousData` keeps the previous successful card on screen while a new fetch is in flight.
- **History via `useSyncExternalStore`.** localStorage is React's textbook "external store." Every `useHistory()` consumer subscribes to the same in-module pub/sub, so deletions in one component re-render the others without prop drilling or Context. Cross-tab updates are wired through the native `storage` event.

## Gotchas

### `keepPreviousData` + any "commit on success" side effect

`useWeather` uses `placeholderData: keepPreviousData` so the previous weather
card stays on screen while a new fetch is in flight. The side effect is that
the tuple `(isSuccess, data, activeQuery)` becomes briefly inconsistent:

- `activeQuery` has already flipped to the new city (URL changed)
- `query.isSuccess` stays `true`
- `query.data` still points at the **previous** city's payload
- `query.isPlaceholderData` is `true` until the new fetch resolves

Any code that commits a derived value from `query.data` keyed by `activeQuery`
during this window will write stale data under a fresh key. The history-commit
effect in `App.tsx` was bitten by exactly this: it wrote `activeQuery` ("Berlin,
Germany") alongside `formatDisplayName(previousData)` ("Santa Cruz Xoxocotlán,
Mexico") and then locked itself out via its own ref guard, so the real Berlin
payload never made it into history.

**Rule:** if you gate a `useEffect` on `query.isSuccess`, also gate on
`!query.isPlaceholderData` whenever the effect correlates `query.data` with the
current query key. Or wait for `isFetching === false`. Just `isSuccess` is not
enough with `keepPreviousData`.

## Stack

- **React 19** + **TypeScript** (strict, including `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`)
- **Vite 6** with `@cloudflare/vite-plugin` for unified dev
- **Cloudflare Workers** with the static-asset binding (one deploy for SPA + API)
- **TanStack Query 5** for async state, caching, and request lifecycle
- **Tailwind v4** + **shadcn/ui** with a custom theme
- **Vitest** + **MSW** + **@cloudflare/vitest-pool-workers**
- **ESLint** (typescript-eslint, react-hooks, react-refresh) + **Prettier**
