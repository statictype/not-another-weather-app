# RFC 007 — URL-driven city state

## Problem

Today the active city lives in React `useState` inside `App.tsx`:

```ts
const [activeQuery, setActiveQuery] = useState<string | null>(
  () => getHistorySnapshot()[0]?.query ?? null,
);
const [source, setSource] = useState<WeatherSource>(() =>
  getHistorySnapshot()[0] ? "auto" : "user",
);
```

Four consequences fall out of this:

1. **No link sharing.** `oasis.app/` is the only URL the user ever sees,
   regardless of what they've searched. Copy-paste the URL to a friend
   and they land on an empty state.
2. **No back/forward navigation.** Every selection replaces the visible
   city; the browser's back button escapes the app entirely.
3. **Dual read paths in App.** State is sometimes seeded from history
   (`"auto"` source), sometimes driven by user clicks (`"user"` source).
   A `source` prop threads through `useWeather` → `WeatherResult` to
   drive asymmetric error policy ("silent auto-load failure vs. loud
   user failure").
4. **Integration tests click through.** Every test navigates via
   type-into-input → wait-for-suggestion → click-suggestion → wait-for-card,
   even when the assertion only cares about "the weather card renders
   for London". This couples every weather test to the search-bar UI.

## Proposal

The URL's `?city=<normalizedQuery>` query parameter becomes the single
source of truth for the active city.

- `App.tsx` drops both `useState` calls for `activeQuery` and `source`.
  It reads the city from a new `useSearchParam("city")` hook and fetches
  via `useWeather`.
- A one-time bootstrap in `main.tsx` populates `?city=` from
  `getHistorySnapshot()[0]` when the URL is empty, so returning users
  still see their last city — but now the URL accurately reflects what's
  on screen from the first paint.
- The `source` prop and the `"auto" | "user"` distinction are deleted.
  Every fetch is user-initiated (either the user typed the URL, shared
  a link, clicked a suggestion, or picked from history).
- Integration tests navigate to `/?city=London` and assert. No
  click-through required, no coupling to search-bar UI.

## Design decisions

### D1. Bootstrap in `main.tsx`, not inside App

**Chosen: C (main.tsx bootstrap).**

Three options were considered:

**A — Don't touch the URL. Fall back to history inside App.**
App reads `?city` if present, else reads `history[0]`. The URL stays
`/` even when a city is on screen.

- ✅ Simplest implementation (no side effect).
- ✅ Clean back-button behavior.
- ❌ URL and displayed city disagree. Copying the URL or bookmarking
  loses the selected city — defeats half the point of the refactor.
- ❌ Two read paths in App. The hook needs a fallback argument or App
  needs an `??` chain, which reintroduces the dual-state mess we're
  trying to delete.

**B — `replaceState` from inside App on mount.**
App's first render sees no URL param, then an effect calls
`history.replaceState(null, "", "?city=london")` and App re-renders.

- ✅ URL ends up accurate.
- ✅ One read path inside App.
- ❌ Two commits on cold load: render-with-no-city, then render-with-city.
  The first commit would flash the empty state.
- ❌ Side effect inside React for something that's inherently
  pre-render bootstrap.

**C — Bootstrap in `main.tsx` before `createRoot(...).render()`.**
A ~5-line synchronous block reads `getHistorySnapshot()` and calls
`history.replaceState` before React mounts at all.

- ✅ URL is accurate from the first paint. No flash.
- ✅ App has exactly one read rule: "the URL `city` param is the active
  query." No fallback, no effect, no `useState`.
- ✅ `getHistorySnapshot()` is already a synchronous localStorage
  accessor evaluated at module import time, so this runs deterministically.
- ❌ Logic lives outside React's render tree — slightly unusual, but
  proportional to the problem (bootstrap is bootstrap).

**Rejected: B** because flashing the empty state is user-visible.
**Rejected: A** because the URL-source-of-truth property is the whole
point — accepting a discrepancy on cold load would undo it.

### D2. `replaceState` vs. `pushState` in the bootstrap

**Chosen: `replaceState`.**

`pushState` would add a phantom entry to the browser's back-button
history. A user who opens the app, sees their returning-user city, and
clicks "back" would land on an internal app state rather than the
previous page they were actually on. `replaceState` rewrites the
current entry in place without growing the history stack.

### D3. One-time bootstrap vs. reactive URL sync

**Chosen: one-time bootstrap only.**

The bootstrap runs exactly once, at module load, before React mounts.
After that, **App never writes to the URL automatically** — only the
user's explicit actions do (selecting a suggestion, clicking a history
item). Rejected: "always sync URL to history[0]" because that would
override the user's navigation on every mount and defeat bookmark /
link-sharing behavior.

### D4. Custom hook vs. React Router

**Chosen: custom ~20-line hook.**

React Router is ~15 KB gzipped, introduces a `<BrowserRouter>` wrapper
and a routing vocabulary the app doesn't need (one "route", no nested
views, no loaders). The app has exactly one dynamic URL param. A
hand-rolled `useSearchParam(name)` using `useSyncExternalStore` plus a
`popstate` listener is shorter than the React Router import statement
would be, and doesn't add to the bundle.

TanStack Router was also considered for consistency with TanStack Query
already in the bundle. Same verdict: overkill for one URL param.

### D5. Parameter name and value format

**Chosen: `?city=<rawQueryString>` with no extra encoding beyond
`encodeURIComponent`.**

Alternatives considered:

- `?q=...` — matches the existing API query parameter. Rejected because
  `q` is an API internal name; `city` is clearer to a user seeing the
  URL.
- `?city=<normalizedQuery>` (pre-normalized) — would ensure the URL is
  always in the canonical form (lowercase, collapsed whitespace).
  Rejected because it loses the display form. "New York" in the URL
  reads better than "new york". Normalization happens at the TanStack
  queryKey layer anyway, so cache keys still collapse correctly.
- Path segments (`/city/london`) — would need a router or pattern
  match. Query param is simpler and keeps the app at `/`.
- Hash fragment (`#city=london`) — hash state isn't sent to the server,
  which matters if we ever add SSR or prerendering. Rejected.

### D6. Deleting the `source` prop

**Chosen: delete it.**

The `source: "user" | "auto"` prop existed so that `WeatherResult`
could decide whether to show a full-page error takeover (on user
failures) or silently fall back to the empty state (on auto-load
failures). The rationale: "don't greet a returning user with an error
screen".

With URL state, every fetch is user-initiated in a meaningful sense:

- Typing the URL / clicking a shared link — user action.
- Selecting a suggestion — user action.
- Clicking history — user action.
- Cold load with URL populated from history bootstrap — **also** a
  user action, transitively: the user previously visited this city,
  and the bootstrap preserves that selection.

If the bootstrap'd city fails to fetch (network down, quota exceeded),
the user legitimately deserves to know — silently showing the empty
state would be confusing ("where's my city?"). So the asymmetric policy
goes away and the single behavior becomes: errors show the error UI.
Quota-exceeded still takes over (it's global degradation, not a
per-request failure).

One edge case worth naming: if localStorage contains a stale city that
the upstream no longer resolves (rare — city name changed or typo), the
user sees a `not_found` error on cold load. The fix is: click a new
suggestion. Acceptable trade-off for the simplification.

### D7. `useSyncExternalStore` vs. effect + state

**Chosen: `useSyncExternalStore`.**

`popstate` is a browser event external to React. The history store
(`src/hooks/use-history/store.ts`) already uses `useSyncExternalStore`
for the same reason, so the pattern is established in the codebase.
Using `useEffect + useState` would work but is the wrong tool for an
external store.

## Implementation

### New file: `src/hooks/use-search-param.ts`

```ts
import { useSyncExternalStore } from "react";

/**
 * Subscribes to a single URL search param via `useSyncExternalStore`.
 * Re-renders when `popstate` fires (back/forward) or when another
 * subscriber updates the URL via the exported `setSearchParam` helper.
 *
 * Cross-tab updates are not handled — URL state is inherently per-tab.
 */

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  window.addEventListener("popstate", notify);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("popstate", notify);
    }
  };
}

function getSnapshot(name: string): string | null {
  return new URL(window.location.href).searchParams.get(name);
}

export function useSearchParam(name: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(name),
    () => null, // SSR snapshot — no URL params
  );
}

/**
 * Update a single search param and notify subscribers. Pass `null` to
 * remove. Uses `pushState` so back/forward navigation works.
 */
export function setSearchParam(name: string, value: string | null): void {
  const url = new URL(window.location.href);
  if (value === null) {
    url.searchParams.delete(name);
  } else {
    url.searchParams.set(name, value);
  }
  history.pushState(null, "", url.toString());
  notify();
}
```

Two exports: `useSearchParam` (read, reactive) and `setSearchParam`
(write, imperative). The write function lives here rather than as a
hook return because callers call it from event handlers, not during
render.

### `main.tsx` bootstrap

```ts
import { getHistorySnapshot } from "@/hooks/use-history";

// Bootstrap the URL from history before React mounts, so the app only
// ever sees the "URL is the source of truth for the active city" path.
// See docs/rfcs/007-url-driven-city.md, D1–D3.
const bootstrapUrl = new URL(location.href);
if (!bootstrapUrl.searchParams.get("city")) {
  const last = getHistorySnapshot()[0];
  if (last) {
    bootstrapUrl.searchParams.set("city", last.query);
    history.replaceState(null, "", bootstrapUrl.toString());
  }
}

createRoot(document.getElementById("root")!).render(<App />);
```

### `App.tsx` changes

Delete:

- `useState<string | null>` for `activeQuery`
- `useState<WeatherSource>` for `source`
- The `useEffect` that commits successful fetches to history (moved —
  see below)
- The `handleValueChange` line that sets source to "user"

Replace with:

```ts
const activeQuery = useSearchParam("city");
const query = useWeather({ query: activeQuery });

// Selection handlers all call setSearchParam instead of setState
const handleSuggestionSelect = (item: SuggestionItem) => {
  const q = item.region
    ? `${item.name}, ${item.region}, ${item.country}`
    : `${item.name}, ${item.country}`;
  setInputValue("");
  setSearchParam("city", q);
};

const handleHistorySelect = (item: HistoryItem) => {
  setInputValue("");
  setSearchParam("city", item.query);
};
```

The "commit successful fetches to history" effect stays in App because
it's a side effect of fetch success, not URL change. It simplifies,
though, because there's no `source !== "user"` guard — every successful
fetch goes to history.

### `useWeather` changes

Drop the `source` option and the `UseWeatherResult.source` field. The
signature becomes:

```ts
export function useWeather(options: {
  query: string | null;
  minLength?: number;
}): UseQueryResult<WeatherCurrent, WeatherClientError>;
```

### `WeatherResult` changes

Drop the `source === "auto"` branch in the error handling. Network /
upstream errors always show the `ErrorState` (with retry). Quota still
takes over. Empty state only renders when there is no active query at
all (`activeQuery === null`, i.e. fresh user with no history).

### Integration test changes

Tests that exercise the weather render path navigate via URL:

```ts
function renderAppAt(url: string) {
  __resetHistoryStoreForTests();
  history.replaceState(null, "", url);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

it("renders the weather for the city in the URL", async () => {
  renderAppAt("/?city=London");
  await screen.findByText(/partly cloudy/i);
  expect(screen.getByText("12")).toBeInTheDocument();
});
```

The suggestion-click flow still gets its own test, but it's one test
focused on the search-bar interaction — not every weather assertion
depending on it.

Tests that care about the history bootstrap set up localStorage
before calling `renderAppAt("/")` and assert the URL got rewritten
plus the city rendered.

## What this is NOT

- Not a router. One URL param, zero routes, zero `<BrowserRouter>`.
- Not a state management refactor. TanStack Query still owns fetch
  state; the URL only owns "which query".
- Not SSR. The bootstrap enables a future SSR path (the edge worker
  could pre-render the hero at the queried city if `?city=` is
  present in the request URL) but implementing that is a separate
  RFC.
- Not per-field URL state. We're not encoding units, tabs, or forecast
  days in the URL. `?city=` is the only param that belongs there.

## Migration

One PR, roughly:

1. Add `src/hooks/use-search-param.ts`.
2. Add the bootstrap to `main.tsx`.
3. Rewrite `App.tsx`: remove the two `useState`s, wire `useSearchParam` +
   `setSearchParam` into the selection handlers.
4. Drop `source` from `useWeather` and `WeatherResult`.
5. Rewrite `integration.test.tsx` — most tests become URL-navigation
   tests; the suggestion-click flow keeps one dedicated test.
6. Update `App.test.tsx` if it touches the state shape.
7. Run `pnpm run ci`.

No changes to backend, cache keys, or DTO shapes — RFC 007 is pure
frontend state plumbing.
