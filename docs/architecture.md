# Architecture

## Module layout

```
src/
├── worker.ts              # Worker entry: dispatches /api/* routes, falls through to ASSETS
├── worker/                # Backend (Cloudflare Worker)
│   ├── tiers.ts              # SERVER_TIERS table (ttl/fetch) + createTierHandler factory — one row per weather tier
│   ├── search-handler.ts     # GET /api/search              (autocomplete, no edge cache — `useSuggestions` keeps a 60 s client-side stale window)
│   ├── weather-api.ts        # Upstream client + DTO shaping + error mapping
│   ├── format.ts             # temperature / speed / distance / pressure → MeasurePair
│   ├── precip.ts             # Precipitation pairs + the joint null decided for both systems
│   ├── air-comfort.ts        # Two-axis (thermal × air) labeler + beaufort — reads canonical °C / kph (RFC 012)
│   ├── cache.ts              # Cache API helpers (per-endpoint TTL)
│   ├── respond.ts            # Shared JSON / cache-header response builders
│   ├── errors.ts             # WeatherApiError + upstream-code → kind mapping
│   └── types.ts              # Env binding type
├── api/                   # Frontend API client
│   ├── weather.ts         # fetch wrappers (current / forecast / search) — throws WeatherClientError
│   └── types.ts           # Type-only re-exports from @/lib/schemas + SuggestionItem
├── hooks/
│   ├── use-debounced-value.ts
│   ├── use-media-query.ts       # SSR-safe matchMedia subscription
│   ├── use-search-param.ts      # ?city= as a useSyncExternalStore source
│   ├── use-suggestions.ts       # Autocomplete query (debounced 300ms, 3-char min)
│   ├── use-undo.ts              # Pending-removal state machine (generic primitive)
│   ├── use-weather.ts           # Two TanStack Query hooks: current / forecast
│   ├── use-reversible-history.ts # useHistory + useUndo + sonner toast, one call per action
│   ├── use-unit-system.ts       # In-module pub/sub over localStorage — °C/°F, defaulted from the locale's region
│   └── use-history/             # Reducer + in-module pub/sub over localStorage
├── components/
│   ├── search-bar/        # Composite search input — single Input + useSearchMenu state machine + one Menu renderer
│   │   ├── index.tsx            # public re-export
│   │   ├── search-bar.tsx       # composition: form + Input (always in flow) + mobile-overlay backdrop
│   │   ├── use-search-menu.ts   # state machine: value, isFocused, selectedKey, commit-then-close
│   │   ├── menu-model.ts        # pure buildMenuModel(args) + types — the test surface for the branching ladder
│   │   ├── menu.tsx             # one Menu component, CSS-driven across breakpoints (no variant prop)
│   │   ├── constants.ts         # MIN_SUGGESTION_LENGTH
│   │   ├── section-header.tsx   # shared label primitive
│   │   └── clear-all-button.tsx # lazy-loaded alert-dialog confirmation
│   ├── weather/           # The card grid — composed in grid.tsx
│   │   ├── grid.tsx                  # row layout + calls useWeatherForecast
│   │   ├── hero-card.tsx             # LCP card — city, condition, location-local date and time
│   │   ├── air-comfort-card.tsx      # raw metrics tile — dew, humidity, cloud, wind, visibility
│   │   ├── exposure-card.tsx         # UV + AQI tile
│   │   ├── wind-card.tsx             # compass — speed, Beaufort, direction, bearing
│   │   ├── pressure-card.tsx         # half-circle pressure gauge
│   │   ├── astro-card.tsx            # sunrise / sunset / moon phase
│   │   ├── forecast-card.tsx         # the future days upstream returns, 2 or 3 (today lives in the hero)
│   │   ├── hourly-card.tsx           # next-24h strip
│   │   ├── time-card.tsx             # location-local time
│   │   └── condition-icon.tsx        # shared icon mapping
│   ├── weather-result.tsx # State-machine container (drives off `current` only)
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   ├── quota-exceeded-state.tsx
│   ├── weather-skeleton.tsx
│   └── ui/                # shadcn/ui primitives (vendored — ESLint ignores this folder)
├── lib/
│   ├── schemas.ts         # Zod DTOs — single source of truth for the wire boundary (RFC 008)
│   ├── errors.ts          # Error taxonomy table (kind ↔ status ↔ message)
│   ├── tiers.ts           # WeatherTier union + route paths — wire-spanning identity for both tiers
│   ├── query.ts           # normalizeQuery — shared by worker cache key + frontend query key
│   ├── query-client.ts    # TanStack Query config + retry policy
│   ├── units.ts           # UnitSystem union + read(pair, system) — wire-spanning identity for the toggle
│   ├── clock.ts           # Every time and date the client formats, off one CLOCK locale table
│   ├── random-cities.ts   # Pool for the "surprise me" button
│   └── utils.ts           # cn() helper
├── test/                  # MSW server + setup (frontend project only)
├── App.tsx                # Composition
├── main.tsx               # Root, QueryClient, URL bootstrap from history (replaceState)
└── integration.test.tsx   # End-to-end-ish coverage of the URL → fetch → render → history flow
```

## Design choices

- **Single Cloudflare Worker hosts both surfaces.** The same `wrangler deploy` ships the SPA bundle (via the static-asset binding) and the three `/api/*` endpoints. The upstream API key lives only on the server side and never reaches the browser, and proxy + frontend share an origin so there's no CORS to wire up.
- **Two-tier weather pipeline.** Rather than one fat `/api/weather` call, the worker exposes `current` and `forecast` as independent endpoints with TTLs sized to their volatility (10 min / 1 h). The hero paints from `current` alone (LCP-critical) and the forecast tier streams in inside the grid. Both tiers are defined as a single named concept (`WeatherTier` in `src/lib/tiers.ts`) — worker-side `SERVER_TIERS` and client-side `CLIENT_TIERS` tables are both keyed by this union so adding or renaming a tier is a one-row change on each side rather than a new file. A third `yesterday` tier shipped originally and was removed once the forecast card dropped its history column; RFC 001 describes the three-tier design as built.
- **Shaped DTOs defined once, in zod.** `src/lib/schemas.ts` is the single source of truth for every wire shape. The worker value-imports the schemas to validate upstream responses; the frontend type-imports only, so zod's runtime is tree-shaken out of the client bundle. An ESLint rule blocks runtime zod imports in `src/{api,hooks,components}`. See RFC 008.
- **Both unit systems arrive on the wire, pre-formatted.** Upstream returns imperial beside metric in one response, so the worker formats both and the client picks one. Every display quantity is a `MeasurePair` — `{ metric, imperial }`, each a `{ text, value, suffix, spoken }` — and switching is `read(pair, system)`, with no refetch, no remount and no arithmetic on the client. `read` returns a dash when a pair is absent, which is what a browser holding a pre-bump body (`max-age` is 10 min / 1 h) would otherwise turn into a property access on `undefined`. The raw `tempC` / `windKph` / `visibilityKm` family stopped shipping; what stayed a number is what feeds a colour, a bar width or an SVG angle (`pressureMb`, `uv`, `airQualityIndex`, `windDegree`, `humidity`, `cloud`). See issue 006.
- **A classification reads one canonical field.** `airComfort` and `beaufort` moved to `src/worker/` with the formatters. The reason is not theoretical: the published Beaufort tables are independently rounded per unit — force 3 is 12–19 km/h and 8–12 mph — so any wind in the 1.6 km/h gap between 12 mph and 13 mph would read "Gentle breeze" to one viewer and "Moderate breeze" to another if each classified in their own display system. Toggling changes no word, no colour and no needle angle.
- **The worker formats what comes from the payload; the client formats what comes from the clock.** The hero ticks every second, so a string baked into a body cached for 10 minutes cannot show the current time. Astro times, hourly labels and alert stamps _are_ payload — but two producers implementing one rule is how three date conventions accumulated in the first place, so all 11 sites moved to `src/lib/clock.ts` instead. One `CLOCK` table maps metric to `en-GB` (24-hour, `Fri 15 Aug`) and imperial to `en-US` (12-hour, `Fri Aug 15`). Tying the clock to a °C/°F toggle misfits the UK, which is metric-leaning and reads 12-hour; it is still an improvement, because every viewer previously got `en-US` regardless of locale.
- **Units are a viewer preference, not view state.** The store is a third `createSubscription` over localStorage, defaulted from `new Intl.Locale(navigator.language).region` (`US`, `LR`, `MM` → imperial). Not the URL: a shared `?city=` link should read in the recipient's units, not the sender's. The stored string indexes the DTO, so it is validated against the union on read rather than trusted.
- **Edge cache with query normalization.** Each weather endpoint caches successful responses at the edge (10 min / 1 h), keyed on a normalized query (trimmed, lowercased, internal whitespace collapsed). `London`, `london`, `LONDON`, and `London ` all share one cache entry per endpoint. The autocomplete endpoint (`/api/search`) is intentionally not edge-cached — results are ephemeral and the client-side debounce + 60 s `staleTime` keeps the upstream call rate low. `normalizeQuery` in `src/lib/query.ts` is shared by the worker's cache key and the frontend's TanStack Query key so the two sides can't drift.
- **Closed error union end-to-end.** Both worker and frontend client model errors as a discriminated union (`not_found | quota_exceeded | invalid_query | upstream | network`) defined in a single table (`src/lib/errors.ts`) that derives the kind ↔ status ↔ default-message mappings. Adding a kind is a one-row change that TypeScript propagates.
- **Retry policy follows the error taxonomy.** `src/lib/query-client.ts` skips retry on the three user-meaningful kinds (`not_found`, `invalid_query`, `quota_exceeded`) so the UI reacts instantly. Transient network and upstream failures retry up to 2 times with exponential backoff capped at 5 s. `CLIENT_TIERS` (in `src/hooks/use-weather.ts`) carries no per-tier override, so this table is the whole policy.
- **URL is the source of truth for the active city.** `?city=…` drives every fetch. `main.tsx` bootstraps the URL from history with `replaceState` on cold load, so returning users still see their last city — but from the first paint the URL accurately reflects what's on screen. Because every fetch is now legitimately the user's intent, there is no "silent fallback" — failed system fetches (network/upstream) take over the result area with a retry CTA. See RFC 007.
- **Autocomplete is the debounced surface, weather fetches are not.** Suggestions (`/api/search`) fire 300 ms after idle typing, gated at 3 chars. The actual weather fetch only fires when the URL changes — selecting a suggestion, picking from recent history, geolocation, or "surprise me". TanStack Query dedupes identical keys and `placeholderData: keepPreviousData` keeps the previous successful card on screen while a new fetch is in flight.
- **History via `useSyncExternalStore`.** localStorage is React's textbook "external store." Every `useHistory()` consumer subscribes to the same in-module pub/sub, so deletions in one component re-render the others without prop drilling or Context. Cross-tab updates are wired through the native `storage` event. All four history transitions (`add` / `remove` / `clear` / `restore`) live as pure functions in `src/hooks/use-history/reducer.ts` — the hook is plumbing on top. See RFC 010.
- **`useReversibleHistory` owns the remove + undo + toast story.** Composes `useHistory` + `useUndo` and the sonner toast call so App.tsx gets a single function per destructive action (`removeWithUndo`, `clearAllWithUndo`). The ordering invariant (mutate → stage → toast → wire) is sealed inside the hook; sonner is hard-wired because it's the project's only toast lib and this file is the seam for any swap. See RFC 010.
- **Search bar — one Input, one state machine, one renderer.** `useSearchMenu` owns input value, focus, and selectedKey; `buildMenuModel` is the pure branching ladder (recents / keep-typing / suggestions / no-results / actions) tested in isolation; `<Menu>` renders the model with breakpoint-driven CSS — no `variant` prop. The input wrapper stays in document flow on every state so y-position is stable across focus/blur; the mobile overlay is a glass backdrop sitting _below_ the page header (emoji + input stay visible above it) plus a Cancel button that slides in with motion `layout`. The default focused row is the first city match on both platforms, so Enter always runs the obvious target (no "Select a city from the list" prompt). See RFC 011.

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
