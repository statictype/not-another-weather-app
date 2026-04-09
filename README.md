# Oasis

A small, fast weather forecast app. Search any city, see today's conditions and forecast.

> **Live demo:** _link goes here once deployed_
>
> The demo runs on a free WeatherAPI tier with edge caching, which keeps it
> within quota under reasonable load. If the quota is exhausted, the app
> degrades to a friendly explanatory state instead of an error page.

![Oasis screenshot](./docs/screenshot.png)

## Features

- Search any city with debounced search-as-you-type
- Today's forecast: temperature, condition, feels-like, min/max, wind, humidity, rain chance
- Recent searches with one-click recall, per-item delete, and clear-all
- Undo for any deletion via toast
- The previous successful result stays visible while you type a new query
- Auto-loads your last city on return visits
- Graceful degradation when the upstream API is down or quota is exhausted
- Fully keyboard accessible, respects reduced motion
- Single Cloudflare Worker hosts both the SPA and the API proxy

## Quick start

Prerequisites: Node 22, pnpm 10.

```bash
pnpm install
pnpm dev
```

The dev server runs Vite + the Cloudflare Worker together. The app is available at the URL Vite prints; `/api/weather` is handled by the Worker locally.

### Bring your own API key (optional)

The repo ships with `.dev.vars.example`. Copy it and add a free key from [WeatherAPI.com](https://www.weatherapi.com/signup.aspx) to run locally without depending on the deployed proxy:

```bash
cp .dev.vars.example .dev.vars
# edit .dev.vars and paste your key
```

## Architecture

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

A few of the more interesting design choices:

- **Single Cloudflare Worker hosts both surfaces.** The same `wrangler deploy` ships the SPA bundle (via the static-asset binding) and the `/api/weather` proxy. The upstream API key lives only on the server side and never reaches the browser, while the proxy and the frontend share an origin so there's no CORS to wire up.
- **Shaped DTO at the proxy boundary.** The frontend never sees the upstream vendor's schema. Swapping weather providers means changing one file in the Worker. The DTO is intentionally minimal — only fields the UI actually renders.
- **Edge cache with query normalization.** The Worker caches successful responses for 10 minutes, keyed on a normalized query (trimmed, lowercased, whitespace collapsed). `London`, `london`, `LONDON`, and `London ` all share one cache entry. This is what keeps the demo within the free tier under reasonable load.
- **Closed error union end-to-end.** Both the Worker and the frontend client model errors as a discriminated union (`not_found | quota_exceeded | invalid_query | upstream | network`), and the renderer is one exhaustive switch. Adding a new error kind is a single-spot change that TypeScript enforces.
- **Search-as-you-type with debounce + cancellation.** No submit button. After 500ms of idle typing the query fires; if the user keeps typing, the in-flight request is cancelled via `AbortSignal`. TanStack Query dedupes identical queries and keeps the previous successful result visible while a new (or failing) one runs.
- **Asymmetric error policy.** Input errors (`not_found`) annotate the search input as inline validation and leave the previous weather card on screen. System errors (`quota_exceeded`, `network`, `upstream`) take over the result area. The user is never punished for typos.
- **Auto-load is silent.** On mount, the most recent history item is fetched with `source: "auto"`. If that fetch fails, the failure is silent (the empty state appears) — a returning user shouldn't open the app to an error message they didn't ask for. Errors from auto-loads only become visible when they explain a global degradation (quota exceeded).
- **History via `useSyncExternalStore`.** localStorage is React's textbook "external store." Every `useHistory()` consumer subscribes to the same in-module pub/sub, so deletions in one component re-render the others without prop drilling or Context. Cross-tab updates are wired through the native `storage` event.

## Stack

- **React 19** + **TypeScript** (strict, including `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`)
- **Vite 6** with `@cloudflare/vite-plugin` for unified dev
- **Cloudflare Workers** with the static-asset binding (one deploy for SPA + API)
- **TanStack Query 5** for async state, caching, and request lifecycle
- **Tailwind v4** + **shadcn/ui** with a custom theme
- **Vitest** + **MSW** + **@cloudflare/vitest-pool-workers**
- **Biome** for lint, format, and import organize

## Testing

```bash
pnpm test         # watch mode
pnpm test:run     # single run
```

The suite has two projects:

- **`frontend`** runs in jsdom and tests the React app, hooks, and the API client. Mocks are at the network boundary via **MSW** so the real fetch path is exercised end-to-end.
- **`worker`** runs in workerd via `@cloudflare/vitest-pool-workers` and tests the Worker handler against `fetchMock` (an undici mock agent). Real Worker runtime, real Cache API, real bindings — no Node-side simulation.

What's covered:

- The hooks (`useHistory`, `useUndo`, `useDebouncedValue`, `useWeather`) are tested exhaustively because they hold the branching logic.
- The Worker proxy is tested per branch: happy path, 404, quota, generic upstream, empty query, cache hit, cache normalization.
- The frontend API client is tested per error kind via MSW.
- One integration test exercises the full search → render → history → undo flow against the real composition.
- Per-component unit tests are intentionally not written. They tend to re-implement the component in the test and break on every refactor without catching real bugs. The hook tests + integration test cover what matters.

## Scripts

| Command          | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| `pnpm dev`       | Vite dev server with the Worker integrated     |
| `pnpm build`     | Type-check + production build                  |
| `pnpm preview`   | Preview the built bundle                       |
| `pnpm deploy`    | Build and deploy to Cloudflare Workers         |
| `pnpm typecheck` | Type-check across all three project references |
| `pnpm lint`      | Biome lint + format check                      |
| `pnpm lint:fix`  | Biome auto-fix                                 |
| `pnpm test`      | Vitest watch mode (both projects)              |
| `pnpm test:run`  | Vitest single run                              |
| `pnpm ci`        | Lint + typecheck + test + build (full CI gate) |

## Deployment

The repo deploys to a single Cloudflare Worker via GitHub Actions on every push to `main`. The Worker hosts the built SPA from `dist/client` and the `/api/weather` proxy in one bundle.

To deploy manually:

```bash
pnpm wrangler login
pnpm wrangler secret put WEATHER_API_KEY  # production secret
pnpm deploy
```

For CI deploys, set these GitHub repo secrets:

- `CLOUDFLARE_API_TOKEN` — scoped to "Edit Cloudflare Workers"
- `CLOUDFLARE_ACCOUNT_ID`

## Roadmap

Things I'd add with more time:

- Multi-day forecast view with hourly breakdown
- Unit toggle (°C / °F)
- Geolocation-based default city on first visit
- Per-IP rate limiting via Durable Objects
- Stale-while-revalidate at the edge (return cached, refetch in background)
- Sentry / structured logging
- i18n for the handful of UI strings

## License

MIT.
