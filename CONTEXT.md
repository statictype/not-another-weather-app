# CONTEXT — ubiquitous language

Domain terms used in code, docs, and conversation. Each entry is short on
purpose; follow the pointers for the full story.

---

## Data model

**Weather tier** — one of three independently-cacheable slices of the
weather payload: `current`, `forecast`, `yesterday`. Defined once as the
`WeatherTier` union in `src/lib/tiers.ts`; both server-side
`SERVER_TIERS` (`src/worker/tiers.ts`) and client-side `CLIENT_TIERS`
(`src/hooks/use-weather.ts`) are records keyed by it. Adding or
renaming a tier is a one-row change on each side. See RFC 001.

**Active city** — the city currently rendered. Driven entirely by the
URL's `?city=` query param, read via `useSearchParam("city")`. Every
weather fetch keys off this; no internal "current city" state exists.
Bootstrapped from history on cold load via `replaceState` in `main.tsx`.
See RFC 007.

**Normalized query** — the canonical form of a user's city query:
trimmed, lowercased, internal whitespace collapsed. Produced by
`normalizeQuery` in `src/lib/query.ts`. Used as both the edge-cache key
on the worker and the TanStack Query key on the client, so the two
sides cannot drift. `London` / `london` / `LONDON ` / `london` all
resolve to one cache entry per tier.

**Suggestion** — an autocomplete item from `/api/search`. Distinct from
a **history item** (a city the user actually selected). Suggestions are
fetched debounced (300 ms) at a 3-char minimum via `useSuggestions`.

**History item** — a previously-selected active city, persisted to
`localStorage`. Stored as `{ query, displayName, ... }` so we can show
"Berlin, Germany" rather than the raw query string the user typed.

---

## State + flow

**History-commit** — the act of writing the just-fetched city into
history after a successful weather response. Lives in the
history-commit effect at `src/App.tsx:46–56`. The effect is the
canonical victim of the **placeholder-data window** below.

**Placeholder-data window** — the window between a query-key change
and the new fetch resolving, during which `query.isSuccess === true`
but `query.data` still points at the **previous** city's payload (and
`query.isPlaceholderData === true`). Any effect that correlates
`query.data` with `activeQuery` during this window writes stale data
under a fresh key. Rule: when gating on `isSuccess`, also gate on
`!isPlaceholderData`. See `docs/architecture.md` gotchas.

**Reversible history** — the destructive-action pattern composed by
`useReversibleHistory` (`src/hooks/use-reversible-history.ts`): mutate
→ stage for undo → fire toast → wire restore callback. Sealed inside
the hook so App.tsx gets a single `removeWithUndo` /
`clearAllWithUndo` per action. Sonner is hard-wired because this hook
is the only seam that would need touching for a toast-lib swap. See
RFC 010.

**Commit-on-success** — generic term for any effect that derives state
from `query.data` once `query.isSuccess` flips true. All such effects
in this codebase must also check `!query.isPlaceholderData` (see
above). History-commit is the only live instance.

---

## Errors

**Kind** — a member of the closed error-union defined in
`src/lib/errors.ts`: `invalid_query | not_found | quota_exceeded |
upstream | network`. Every error the proxy emits or the client renders
is tagged with a kind. `WEATHER_ERRORS` is the single table that maps
each kind to its HTTP status and user-safe default message.

**Closed error union** — the principle that adding a new error mode is
a one-row change to `WEATHER_ERRORS`, propagated by TypeScript through
the worker, the frontend client, the retry policy, and the
`WeatherResult` renderer. No vendor-specific kinds leak past the
worker.

**Vendor code** — a WeatherAPI.com numeric error code (e.g. `1006`,
`2007`). Mapped to a `kind` via `UPSTREAM_CODE_TO_KIND` in
`src/worker/weather-api.ts`. Unknown codes collapse to `upstream`.

**Fatality** — per-tier policy for whether a failed fetch takes over
the UI. `current` is fatal: a failure replaces the result area with a
retry CTA. `forecast` is fatal-by-omission via TanStack Query state.
`yesterday` is **non-fatal at the render layer**: server returns
errors honestly, the client uses `retry: 0`, and `ForecastCard` omits
the column via optional chaining on `yesterday.data?.yesterday`. The
retry-skip lives in the `CLIENT_TIERS` row in `src/hooks/use-weather.ts`.

---

## UI surfaces

**Mood card** — `AirComfortMoodCard`
(`src/components/weather/air-comfort-mood-card.tsx`). Renders the
semantic sentence (`"Warm and slightly humid"`) + Beaufort wind label
on an OKLCH gradient. Consumes the two-axis labeler in
`src/lib/air-comfort.ts`.

**Metrics card** — `AirComfortCard`
(`src/components/weather/air-comfort-card.tsx`). Renders the raw
numbers — dew, humidity, wind, visibility. Does **not** consume the
two-axis labeler. Lives next to the mood card in the grid;
intentionally separate.

**Thermal label** — one of nine labels driven by feels-like
temperature: `Very cold | Cold | Chilly | Cool | Mild | Warm | Hot |
Very hot | Dangerously hot`. See RFC 012.

**Air label** — one of seven labels driven by dew point: `Very dry |
Dry | Slightly dry | Comfortable | Slightly humid | Humid | Very
humid`, plus the **damp override** below. See RFC 012.

**Damp override** — when `tempC < 12 AND humidity > 80` (strict on
both), the air label becomes `Damp` regardless of dew point. Captures
the cold-damp sensation that low absolute humidity readings would
otherwise mask.

**Air-comfort palette** — the single source of truth for the
air-comfort _colors_, in `src/lib/air-comfort-palette.ts`: the
per-bucket `--ac-dry`/`--ac-humid` anchors and the
`--ac-lift`/`--ac-shadow`/`--ac-base-darken` depth params (day +
night), plus the `thermal → bucket` (`THERMAL_BUCKET`) and `air →
humidity %` (`AIR_HUMID_PCT`) mappings — all as plain data.
`air-comfort.ts` owns the _labeling_ ladders and imports the mappings
from here. The live cards still tint via CSS custom properties and the
`.night` cascade, but those properties are **generated** from this
module (`airComfortPaletteCss`) and injected once at startup
(`injectAirComfortPalette`, in `main.tsx`) — they are no longer
hand-written in `index.css`. The `/moods` editor reads the anchors
directly instead of probing the DOM. Retune the palette here, not in
CSS.

**Search overlay** — the mobile presentation of the search menu: a
glass backdrop below the page header, plus a sliding Cancel button.
Same `<Menu>` component renders the desktop dropdown — CSS-driven, no
variant prop. See RFC 011.

**Search menu state machine** — `useSearchMenu`
(`src/components/search-bar/use-search-menu.ts`). Owns input value,
focus, and selected key for the search bar. `buildMenuModel`
(`menu-model.ts`) is the pure branching ladder it consumes (recents /
keep-typing / suggestions / no-results / actions), tested in
isolation. See RFC 011.

---

## Infrastructure

**Edge cache** — Cloudflare's `caches.default` Cache API, used by the
worker to memoize successful weather responses per tier (10 min / 1 h /
24 h). Keyed by `buildCacheKey(path, normalizedQuery, extras)` —
`extras` exists for the yesterday tier's `dt` parameter to avoid UTC
midnight skew.

**Wire boundary** — the network seam between worker and frontend. DTOs
are defined once in `src/lib/schemas.ts` as zod schemas; the worker
value-imports them to validate upstream responses, the frontend
type-imports only. Zod is tree-shaken out of the client bundle and
banned by ESLint in `src/{api,hooks,components}`. See RFC 008.

**Handler factory** — `createTierHandler(tier)` in
`src/worker/tiers.ts`. Returns the request handler for a given tier;
the per-tier knobs (TTL, fetch fn, optional extras) are a single
`SERVER_TIERS[tier]` row. Three near-identical handler files were
collapsed into this factory.

**Cache version** — the `CACHE_VERSION` string in
`src/worker/cache.ts`. Included in every edge-cache key. **Bump it
whenever a DTO shape changes**, or previously-cached entries (valid
against the old schema) will render against new client expectations
with undefined fields. No automated guard exists.

---

## Pointers

- Architecture overview: `docs/architecture.md`
- Design decisions (RFCs): `docs/rfcs/`
- ADRs (smaller / one-off): `docs/decisions/`
- Testing strategy: `docs/testing.md`
- Project instructions: `CLAUDE.md`
