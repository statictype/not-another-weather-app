# RFC 009 — Suggestion-based autocomplete

> **Note.** Reconstructed retroactively from commit `f9d5648` ("feat: replace
> type-to-fetch with city suggestion autocomplete"). This was the load-bearing
> design decision that made RFC 007 (URL-driven city) viable, but it never got
> written up at the time. This doc fills in the design rationale that the
> commit message and the code only hint at.

## Problem

The pre-`f9d5648` app fetched `/api/weather` directly off the search input on
every keystroke, debounced. Three things bit:

1. **Every typo was a fetch.** "Berln" → 404, "Berli" → 200 for some prefix-
   matched town that wasn't what the user wanted, "Berlin" → finally right. We
   paid for upstream calls (against the free-tier quota) and rendered
   transient error states for queries the user hadn't finished typing.
2. **The URL couldn't be a stable contract.** Any keystroke that fired a fetch
   either had to write the in-progress string to the URL or accept that the
   URL would drift from the on-screen city. The first option pollutes browser
   history with partial queries; the second blocks any future URL-as-source-
   of-truth design (RFC 007).
3. **No disambiguation.** "Springfield" exists in ~30 US states. With
   type-to-fetch the upstream picked one for us — usually not the one the
   user wanted — and there was no UI surface to pick a different one.

## Goals

- Network calls fire only for queries the user has _deliberately committed to_.
- Disambiguate ambiguous city names via a selectable list.
- Decouple the typing experience from weather fetching: the input drives
  _autocomplete suggestions_; explicit selection drives the URL, and the URL
  drives the weather fetch.
- Set up the URL as a stable identifier so RFC 007 can treat it as the
  source of truth.

## Proposal

Add a thin proxy endpoint over WeatherAPI's `/v1/search.json` autocomplete,
and replace the type-to-fetch flow with a suggestion-picker dropdown. Only
explicit suggestion or recent-history selection changes the URL.

### New endpoint: `GET /api/search`

`src/worker/search-handler.ts` is a thin pass-through: query →
upstream `/v1/search.json` → list of `SuggestionItem`
(`id, name, region, country, lat, lon, url`). No edge cache (see D2).

### New hook: `useSuggestions`

`src/hooks/use-suggestions.ts` debounces the input by 300 ms, gates on a
3-char minimum, and exposes a TanStack Query result with a 60 s `staleTime`.
It returns `{ data, isLoading, isPending }`, where `isPending` is true when
the user has typed enough characters but the debounce window hasn't elapsed
yet — used by the dropdown to render a subtle pending indicator without
flashing the full skeleton.

### Search dropdown UI

`src/components/search-bar/` becomes the input plus a dropdown that shows,
in order:

1. Recent history items (filtered by the current input string).
2. A divider.
3. Live autocomplete suggestions for the input.

Selecting any row — recent or suggestion — calls `setSearchParam("city", q)`
in `App.tsx`. `useSearchParam` notifies, `useWeather` fires. There is no
path from a keystroke to a weather fetch.

Pressing Enter on an unselected query _does not_ commit. The dropdown shows
a small prompt asking the user to pick a row. See D4.

## Design decisions

### D1. Separate autocomplete endpoint vs. reusing `/api/weather`

**Chosen: separate `/api/search` endpoint.**

WeatherAPI's `/v1/search.json` is purpose-built for autocomplete: it returns
a _list_ of matches with disambiguation metadata (region, country, lat/lon).
`/v1/current.json` returns one full weather payload — overkill for the
suggestion list and the wrong shape for disambiguation. Splitting also lets
the two endpoints have independent cache and rate-limit budgets (D2).

### D2. No edge cache on `/api/search`

**Chosen: client-side `staleTime` only.**

The keyspace is wide and shallow — many cities, each typed prefix visited
rarely across users. Caching at the edge would mostly cache misses. The
frontend already debounces (300 ms) and TanStack Query keeps a 60 s stale
window per normalized prefix, which suppresses upstream hits during a single
typing session without paying for global edge storage.

### D3. 300 ms debounce, 3-char minimum

**Chosen: 300 ms / 3 chars.**

- 300 ms is a standard "absorbs a typing burst, still feels responsive"
  window.
- 3 chars is the smallest threshold that returns useful results from
  `/v1/search.json` — 1–2 chars return long, mostly-irrelevant lists; 3
  chars consistently surfaces the intended city in the top few rows.

Both are exported as constants (`DEBOUNCE_MS`, `MIN_LENGTH`) in
`use-suggestions.ts` so tuning is a one-line change.

### D4. Enter behavior: prompt the user to pick a row

**Chosen: pressing Enter on free-form input shows a "pick a result" prompt
inside the dropdown.**

Considered: Enter commits the raw input string, and `/api/weather` does its
own city resolution upstream. Rejected because:

- It re-introduces the disambiguation problem (Springfield, MA vs. MO vs. IL).
- It re-introduces typo → 404 fetches that this whole RFC exists to avoid.
- The user has already typed enough to populate a suggestion list; one
  extra interaction (pressing Down + Enter, or clicking) costs little and
  removes a whole class of bugs.

The "commit a literal string" path still exists internally — but only for
inputs that are _already known_ to be valid:

- Recent-history re-selection (we already saw this exact query succeed).
- Geolocation (lat/lon is unambiguous by construction).
- "Surprise me" / random city (curated list).

It is only the free-form typed Enter we redirect.

### D5. Where the URL change happens

**Chosen: only at the App-level handler.**

`App.tsx` exposes `handleSuggestionSelect`, `handleHistorySelect`,
`handleLocationRequest`, and `handleRandomSelect`. All four converge on
`setSearchParam("city", q)`. The SearchBar component never touches the URL
directly. This keeps the URL contract centralized — anyone changing how
suggestions or history enter the URL only edits `App.tsx`.

## What this is NOT

- Not a feature flag — type-to-fetch is gone, not toggleable.
- Not an in-page search-results pattern. We don't render "results inside
  the page" — selecting a suggestion _navigates_ to that city's weather.
  The dropdown is a navigation aid, not a result list.
- Not a free-text geocoder. Lat/lon goes through a separate code path
  (the geolocation button), not the search dropdown.

## Testing

- `src/integration.test.tsx` — one dedicated case covers the
  suggestion-click flow end-to-end (search → click → URL change → weather
  fetched → history committed). The rest of the integration tests navigate
  via `?city=` directly, since link-share / bookmark is the more common
  user path and decoupling the assertions from the search-bar UI keeps
  them less brittle (per RFC 006).
- `src/worker.test.ts` — does **not** include `/api/search` cases. The
  endpoint is a thin upstream pass-through and a misbehaving search is a
  benign degradation (dropdown shows nothing). The cost/benefit of
  worker-level tests doesn't justify the fixture maintenance.

## Scope / order with other RFCs

This RFC predates RFC 007 and is its prerequisite. Once selection is the
only way to change the active city, the URL can credibly _be_ the active
city (RFC 007). The two together produce the shape RFC 006's integration
tests rely on (URL-driven navigation, no input → fetch coupling).

This RFC is independent of RFC 001 (three-tier weather pipeline) and RFC
008 (zod at boundaries) — those are server-side changes that don't observe
the input model.
