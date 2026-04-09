# Architecture

## Module layout

```
src/
├── worker.ts              # Worker entry: routes /api/* and falls through to assets
├── worker/                # Backend (Cloudflare Worker)
│   ├── handler.ts         # /api/weather pipeline composition
│   ├── weather-api.ts     # Upstream client + DTO shaping + error mapping
│   ├── cache.ts           # Query normalization + Cache API helpers
│   ├── errors.ts          # WeatherApiError + status mapping
│   └── types.ts           # Env + DTO + ErrorResponse
├── api/                   # Frontend API client
│   ├── weather.ts         # fetch wrapper that throws typed errors
│   └── types.ts           # Mirrors the worker DTO
├── hooks/
│   ├── use-debounced-value.ts
│   ├── use-history.ts     # localStorage + useSyncExternalStore
│   ├── use-undo.ts        # Pending-removal state machine
│   └── use-weather.ts     # TanStack Query wrapper
├── components/
│   ├── search-bar.tsx
│   ├── weather-result.tsx # State-machine container
│   ├── weather-card.tsx
│   ├── history-list.tsx
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   ├── quota-exceeded-state.tsx
│   ├── weather-skeleton.tsx
│   └── ui/                # shadcn/ui primitives (vendored)
├── lib/
│   ├── query-client.ts    # TanStack Query config
│   └── utils.ts           # cn() helper
└── App.tsx                # Composition
```

## Design choices

- **Single Cloudflare Worker hosts both surfaces.** The same `wrangler deploy` ships the SPA bundle (via the static-asset binding) and the `/api/weather` proxy. The upstream API key lives only on the server side and never reaches the browser, while the proxy and the frontend share an origin so there's no CORS to wire up.
- **Shaped DTO at the proxy boundary.** The frontend never sees the upstream vendor's schema. Swapping weather providers means changing one file in the Worker. The DTO is intentionally minimal — only fields the UI actually renders.
- **Edge cache with query normalization.** The Worker caches successful responses for 10 minutes, keyed on a normalized query (trimmed, lowercased, whitespace collapsed). `London`, `london`, `LONDON`, and `London ` all share one cache entry. This is what keeps the demo within the free tier under reasonable load.
- **Closed error union end-to-end.** Both the Worker and the frontend client model errors as a discriminated union (`not_found | quota_exceeded | invalid_query | upstream | network`), and the renderer is one exhaustive switch. Adding a new error kind is a single-spot change that TypeScript enforces.
- **Search-as-you-type with debounce + cancellation.** No submit button. After 500ms of idle typing the query fires; if the user keeps typing, the in-flight request is cancelled via `AbortSignal`. TanStack Query dedupes identical queries and keeps the previous successful result visible while a new (or failing) one runs.
- **Asymmetric error policy.** Input errors (`not_found`) annotate the search input as inline validation and leave the previous weather card on screen. System errors (`quota_exceeded`, `network`, `upstream`) take over the result area. The user is never punished for typos.
- **Auto-load is silent.** On mount, the most recent history item is fetched with `source: "auto"`. If that fetch fails, the failure is silent (the empty state appears) — a returning user shouldn't open the app to an error message they didn't ask for. Errors from auto-loads only become visible when they explain a global degradation (quota exceeded).
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
- **Biome** for lint, format, and import organize
